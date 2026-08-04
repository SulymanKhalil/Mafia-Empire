import { getPusherServer } from "./pusher-server";

// In-memory store of active room codes and their members.
// Lives for the lifetime of the server process — fine for a single-instance deployment.
// Using global to persist state across Next.js dev server hot module reloading.
const globalForRooms = global;

if (!globalForRooms.activeRooms) {
  globalForRooms.activeRooms = new Map();
}

const activeRooms = globalForRooms.activeRooms;

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

export function removeMember(code, role, displayName) {
  const key = code.toUpperCase();
  console.log("[Room Store] Removing member from room:", key, "role:", role, "displayName:", displayName);
  if (activeRooms.has(key)) {
    const members = activeRooms.get(key);
    // Try to remove by displayName first (more specific when multiple roles exist)
    let idx = -1;
    if (displayName) {
      idx = members.findIndex((m) => m.displayName === displayName);
    }
    // Fallback to role if displayName doesn't match
    if (idx === -1) {
      idx = members.findIndex((m) => m.role === role);
    }
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
