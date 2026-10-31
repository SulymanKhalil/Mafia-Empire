import { getPusherServer } from "./pusher-server";

// In-memory store of active room codes and their members.
// Lives for the lifetime of the server process — fine for a single-instance deployment.
// Using global to persist state across Next.js dev server hot module reloading.
const globalForRooms = global;

if (!globalForRooms.activeRooms) {
  globalForRooms.activeRooms = new Map();
}
if (!globalForRooms.mafiaReservations) {
  globalForRooms.mafiaReservations = new Map();
}
if (!globalForRooms.mafiaReservationLocks) {
  globalForRooms.mafiaReservationLocks = new Map();
}

const activeRooms = globalForRooms.activeRooms;
const mafiaReservations = globalForRooms.mafiaReservations;
const mafiaReservationLocks = globalForRooms.mafiaReservationLocks;

async function withMafiaRoomLock(key, operation) {
  const previous = mafiaReservationLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  mafiaReservationLocks.set(key, current);
  await previous;

  try {
    return await operation();
  } finally {
    release();
    if (mafiaReservationLocks.get(key) === current) {
      mafiaReservationLocks.delete(key);
    }
  }
}

export async function reserveMafiaSlot(code, socketId, getActiveSocketIds) {
  const key = code.toUpperCase();

  return withMafiaRoomLock(key, async () => {
    const activeSocketIds = await getActiveSocketIds();
    const reservations = mafiaReservations.get(key) || new Map();
    const now = Date.now();

    for (const [reservedSocketId, reservation] of reservations) {
      if (reservedSocketId === socketId) continue;
      if (activeSocketIds.has(reservedSocketId)) {
        reservation.expiresAt = null;
      } else if (reservation.expiresAt !== null && reservation.expiresAt > now) {
        continue;
      } else {
        reservations.delete(reservedSocketId);
      }
    }

    if ([...reservations.keys()].some((reservedSocketId) => reservedSocketId !== socketId)) {
      mafiaReservations.set(key, reservations);
      return false;
    }

    reservations.set(socketId, { expiresAt: now + 60000 });
    mafiaReservations.set(key, reservations);
    return true;
  });
}

export async function releaseMafiaReservation(code, socketId) {
  const key = code.toUpperCase();

  return withMafiaRoomLock(key, async () => {
    const reservations = mafiaReservations.get(key);
    if (!reservations) return;

    reservations.delete(socketId);
    if (reservations.size === 0) {
      mafiaReservations.delete(key);
    }
  });
}

export function registerRoom(code) {
  const key = code.toUpperCase();
  console.log("[Room Store] Registering room:", key);
  if (!activeRooms.has(key)) {
    activeRooms.set(key, []);
    // Clean up room code from local memory map after 10 minutes.
    // By that time, the creator should have joined (making the Pusher channel occupied)
    // or abandoned the creation flow.
    setTimeout(() => {
      if (activeRooms.has(key)) {
        console.log("[Room Store] Cleaning up room code from local map:", key);
        activeRooms.delete(key);
      }
    }, 600000);
  }
}

export async function isValidRoom(code) {
  const key = code.toUpperCase();
  if (activeRooms.has(key)) {
    console.log("[Room Store] Validating room:", key, "-> true (from memory map)");
    return true;
  }

  // Fallback: check if the channel is occupied on Pusher
  try {
    const pusher = getPusherServer();
    const channelName = `presence-room-${key}`;
    const response = await pusher.get({
      path: `/channels/${channelName}`,
    });
    if (response.status === 200) {
      const data = await response.json();
      if (data.occupied) {
        console.log("[Room Store] Validating room:", key, "-> true (occupied channel on Pusher)");
        // Cache it back in memory
        activeRooms.set(key, []);
        return true;
      }
    }
  } catch (err) {
    console.error("[Room Store] Error checking channel occupancy in Pusher:", err);
  }

  console.log("[Room Store] Validating room:", key, "-> false");
  return false;
}

export function addMember(code, member) {
  const key = code.toUpperCase();
  console.log("[Room Store] Adding member to room:", key, member);
  if (!activeRooms.has(key)) {
    activeRooms.set(key, []);
  }
  const members = activeRooms.get(key);
  // Prevent duplicate additions of the same role from the same client if desired,
  // but since it's simple, we just push it.
  members.push(member);
}

export function removeMember(code, role) {
  const key = code.toUpperCase();
  console.log("[Room Store] Removing member from room:", key, "role:", role);
  if (activeRooms.has(key)) {
    const members = activeRooms.get(key);
    const idx = members.findIndex((m) => m.role === role);
    if (idx !== -1) {
      members.splice(idx, 1);
    }
  }
}

export function getMembers(code) {
  const key = code.toUpperCase();
  const members = activeRooms.get(key) || [];
  console.log("[Room Store] Getting members for room:", key, "->", members);
  return members;
}
