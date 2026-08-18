import { getPusherServer } from "./pusher-server";

// In-memory store of active room codes and their metadata.
// Value structure: { createdAt: number, hasBeenOccupied: boolean, members: Array }
const globalForRooms = global;

if (!globalForRooms.activeRooms) {
  globalForRooms.activeRooms = new Map();
}

const activeRooms = globalForRooms.activeRooms;

// Helper to check if Pusher presence channel is occupied
async function checkChannelOccupied(code) {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
    // Return null if Pusher is not configured
    return null;
  }
  const key = code.toUpperCase();
  try {
    const pusher = getPusherServer();
    const channelName = `presence-room-${key}`;
    const response = await pusher.get({
      path: `/channels/${channelName}`,
    });
    if (response.status === 200) {
      const data = await response.json();
      return data.occupied === true;
    }
    console.warn("[Room Store] Pusher channel query returned status:", response.status);
    return null;
  } catch (err) {
    console.error("[Room Store] Error checking channel occupancy in Pusher:", err);
    return null;
  }
}

// Background cleanup task to purge empty rooms
export async function cleanEmptyRooms() {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
    return;
  }
  console.log("[Room Store] Running periodic cleanup of empty rooms...");
  try {
    const pusher = getPusherServer();
    const response = await pusher.get({
      path: "/channels",
      params: { filter_by_prefix: "presence-room-" },
    });
    
    if (response.status === 200) {
      const data = await response.json();
      const occupiedChannels = data.channels || {};
      const activeKeys = new Set(
        Object.keys(occupiedChannels).map((chName) => 
          chName.replace("presence-room-", "").toUpperCase()
        )
      );
      
      const now = Date.now();
      for (const [key, room] of activeRooms.entries()) {
        const isOccupied = activeKeys.has(key);
        if (isOccupied) {
          room.hasBeenOccupied = true;
        } else {
          // Channel is unoccupied
          if (room.hasBeenOccupied) {
            console.log(`[Room Store Cleanup] Room ${key} was active but is now empty. Destroying.`);
            activeRooms.delete(key);
          } else {
            // Not occupied yet. Check if grace period of 10 minutes has passed.
            const age = now - room.createdAt;
            if (age > 600000) {
              console.log(`[Room Store Cleanup] Room ${key} never occupied within 10 minutes. Expiring.`);
              activeRooms.delete(key);
            }
          }
        }
      }
    } else {
      console.warn("[Room Store Cleanup] Failed to fetch channels list, status:", response.status);
    }
  } catch (err) {
    console.error("[Room Store Cleanup] Error in periodic cleanup:", err);
  }
}

// Schedule the cleanup interval once
if (!globalForRooms.cleanupInterval) {
  globalForRooms.cleanupInterval = setInterval(() => {
    cleanEmptyRooms();
  }, 300000); // every 5 minutes
  if (globalForRooms.cleanupInterval.unref) {
    globalForRooms.cleanupInterval.unref();
  }
}

export function registerRoom(code) {
  const key = code.toUpperCase();
  console.log("[Room Store] Registering room:", key);
  if (!activeRooms.has(key)) {
    activeRooms.set(key, {
      createdAt: Date.now(),
      hasBeenOccupied: false,
      members: [],
    });
    // Clean up room code from local memory map after 10 minutes if it was never occupied.
    setTimeout(() => {
      const room = activeRooms.get(key);
      if (room && !room.hasBeenOccupied) {
        console.log("[Room Store] Cleaning up unoccupied room code from local map:", key);
        activeRooms.delete(key);
      }
    }, 600000);
  }
}

export function occupyRoom(code) {
  const key = code.toUpperCase();
  if (activeRooms.has(key)) {
    const room = activeRooms.get(key);
    if (!room.hasBeenOccupied) {
      console.log("[Room Store] Room marked as occupied:", key);
      room.hasBeenOccupied = true;
    }
  }
}

export async function isValidRoom(code) {
  const key = code.toUpperCase();
  
  if (!activeRooms.has(key)) {
    // If not in cache, check if it's currently occupied on Pusher
    const occupiedStatus = await checkChannelOccupied(key);
    if (occupiedStatus === true) {
      console.log("[Room Store] Validating room:", key, "-> true (from Pusher occupancy, re-caching)");
      activeRooms.set(key, {
        createdAt: Date.now(),
        hasBeenOccupied: true,
        members: [],
      });
      return { valid: true };
    }
    console.log("[Room Store] Validating room:", key, "-> false (not found)");
    return { valid: false, error: "Room not found." };
  }

  const room = activeRooms.get(key);
  const occupiedStatus = await checkChannelOccupied(key);

  if (occupiedStatus === true) {
    room.hasBeenOccupied = true;
    console.log("[Room Store] Validating room:", key, "-> true (occupied channel on Pusher)");
    return { valid: true };
  } else if (occupiedStatus === false) {
    // Unoccupied
    if (room.hasBeenOccupied) {
      console.log("[Room Store] Validating room:", key, "-> false (was occupied but is now empty. Destroying)");
      activeRooms.delete(key);
      return { valid: false, error: "Room not found." };
    }
    
    // Check if grace period is still active
    const age = Date.now() - room.createdAt;
    if (age > 600000) {
      console.log("[Room Store] Validating room:", key, "-> false (grace period expired. Destroying)");
      activeRooms.delete(key);
      return { valid: false, error: "Room not found." };
    }
    
    console.log("[Room Store] Validating room:", key, "-> true (in grace period)");
    return { valid: true };
  } else {
    // occupiedStatus is null (e.g. Pusher API call failed)
    // Keep it valid to avoid false positives/negatives during Pusher API outages
    console.log("[Room Store] Validating room:", key, "-> true (Pusher check failed, falling back to cache)");
    return { valid: true };
  }
}

export function addMember(code, member) {
  const key = code.toUpperCase();
  console.log("[Room Store] Adding member to room:", key, member);
  if (!activeRooms.has(key)) {
    activeRooms.set(key, {
      createdAt: Date.now(),
      hasBeenOccupied: true,
      members: [],
    });
  }
  const room = activeRooms.get(key);
  if (!room.members) {
    room.members = [];
  }
  room.members.push(member);
  room.hasBeenOccupied = true;
}

export function removeMember(code, role, displayName) {
  const key = code.toUpperCase();
  console.log("[Room Store] Removing member from room:", key, "role:", role, "displayName:", displayName);
  if (activeRooms.has(key)) {
    const room = activeRooms.get(key);
    if (!room.members) {
      room.members = [];
    }
    const members = room.members;
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
  const room = activeRooms.get(key);
  const members = room ? (room.members || []) : [];
  console.log("[Room Store] Getting members for room:", key, "->", members);
  return members;
}
