import { getPusherServer } from "./pusher-server";

// In-memory store of active room codes and their metadata.
// Value structure: { 
//   createdAt: number, 
//   hasBeenOccupied: boolean, 
//   members: Array, 
//   gameMode: string, 
//   creatorName: string,
//   isGameStarted: boolean,
//   activePlayers: Array, 
//   actions: Object, 
//   resolvedResult: string,
//   history: Array,
//   mafiaSelections: Object
// }
const globalForRooms = global;

if (!globalForRooms.activeRooms) {
  globalForRooms.activeRooms = new Map();
}

const activeRooms = globalForRooms.activeRooms;

// Helper to check if Pusher presence channel is occupied
async function checkChannelOccupied(code) {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
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
          chName.replace("presence-room-", "").replace("-mafia", "").toUpperCase()
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

export function registerRoom(code, gameMode = "standard", creatorName = "") {
  const key = code.toUpperCase();
  console.log("[Room Store] Registering room:", key, "creator:", creatorName);
  if (!activeRooms.has(key)) {
    activeRooms.set(key, {
      createdAt: Date.now(),
      hasBeenOccupied: false,
      members: [],
      gameMode: "standard",
      creatorName: creatorName,
      isGameStarted: false,
      activePlayers: [],
      actions: {},
      resolvedResult: null,
      history: [],
      mafiaSelections: {}
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

export function occupyRoom(code, gameMode, creatorName) {
  const key = code.toUpperCase();
  if (activeRooms.has(key)) {
    const room = activeRooms.get(key);
    if (!room.hasBeenOccupied) {
      console.log("[Room Store] Room marked as occupied:", key);
      room.hasBeenOccupied = true;
    }
    if (creatorName && !room.creatorName) {
      room.creatorName = creatorName;
    }
  } else {
    // Recreate room in memory if server restarted but Pusher channel is occupied
    activeRooms.set(key, {
      createdAt: Date.now(),
      hasBeenOccupied: true,
      members: [],
      gameMode: "standard",
      creatorName: creatorName || "",
      isGameStarted: false,
      activePlayers: [],
      actions: {},
      resolvedResult: null,
      history: [],
      mafiaSelections: {}
    });
  }
}

export function getRoom(code) {
  const key = code.toUpperCase();
  return activeRooms.get(key) || null;
}

export async function isValidRoom(code, role = null) {
  const key = code.toUpperCase();
  
  if (!activeRooms.has(key)) {
    const occupiedStatus = await checkChannelOccupied(key);
    if (occupiedStatus === true) {
      console.log("[Room Store] Validating room:", key, "-> true (from Pusher occupancy, re-caching)");
      activeRooms.set(key, {
        createdAt: Date.now(),
        hasBeenOccupied: true,
        members: [],
        gameMode: "standard",
        creatorName: "",
        isGameStarted: false,
        activePlayers: [],
        actions: {},
        resolvedResult: null,
        history: [],
        mafiaSelections: {}
      });
      return { valid: true, creatorName: "" };
    }
    console.log("[Room Store] Validating room:", key, "-> false (not found)");
    return { valid: false, error: "Room not found." };
  }

  const room = activeRooms.get(key);
  const occupiedStatus = await checkChannelOccupied(key);

  if (occupiedStatus === false) {
    if (room.hasBeenOccupied) {
      console.log("[Room Store] Validating room:", key, "-> false (was occupied but is now empty. Destroying)");
      activeRooms.delete(key);
      return { valid: false, error: "Room has expired." };
    }
    
    const age = Date.now() - room.createdAt;
    if (age > 600000) {
      console.log("[Room Store] Validating room:", key, "-> false (grace period expired. Destroying)");
      activeRooms.delete(key);
      return { valid: false, error: "Room has expired." };
    }
  }

  if (occupiedStatus === true) {
    room.hasBeenOccupied = true;
  }

  // Prevent selecting more than allowed role limits
  if (role && room) {
    try {
      const pusher = getPusherServer();
      const channelName = `presence-room-${key}`;
      const res = await pusher.get({ path: `/channels/${channelName}/users` });
      if (res.status === 200) {
        const data = await res.json();
        const activeIds = new Set((data.users || []).map(u => u.id));
        if (room.members) {
          room.members = room.members.filter(m => activeIds.has(m.id));
        }
      }
    } catch (e) {
      // Ignore query error and use local room.members cache
    }

    if (role === "mafia") {
      const mafiaCount = (room.members || []).filter(m => m.role === "mafia").length;
      if (mafiaCount >= 3) {
        return { valid: false, error: "Cannot select Mafia: Maximum of 3 Mafia players already reached for this room. Please select another role." };
      }
    }

    if (role === "doctor") {
      const doctorCount = (room.members || []).filter(m => m.role === "doctor").length;
      if (doctorCount >= 1) {
        return { valid: false, error: "Cannot select Doctor: Maximum of 1 Doctor player already reached for this room. Please select another role." };
      }
    }

    if (role === "detective") {
      const detectiveCount = (room.members || []).filter(m => m.role === "detective").length;
      if (detectiveCount >= 1) {
        return { valid: false, error: "Cannot select Detective: Maximum of 1 Detective / Investigator player already reached for this room. Please select another role." };
      }
    }
  }

  return { valid: true, creatorName: room.creatorName };
}

export function addMember(code, member) {
  const key = code.toUpperCase();
  console.log("[Room Store] Adding member to room:", key, member);
  if (!activeRooms.has(key)) {
    activeRooms.set(key, {
      createdAt: Date.now(),
      hasBeenOccupied: true,
      members: [],
      gameMode: "standard",
      creatorName: "",
      isGameStarted: false,
      activePlayers: [],
      actions: {},
      resolvedResult: null,
      history: [],
      mafiaSelections: {}
    });
  }
  const room = activeRooms.get(key);
  if (!room.members) {
    room.members = [];
  }
  const existingIdx = room.members.findIndex(m => m.displayName === member.displayName);
  if (existingIdx !== -1) {
    room.members[existingIdx] = member;
  } else {
    room.members.push(member);
  }
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
    let idx = -1;
    if (displayName) {
      idx = members.findIndex((m) => m.displayName === displayName);
    }
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
