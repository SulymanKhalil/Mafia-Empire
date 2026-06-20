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
  }
}

export function isValidRoom(code) {
  const key = code.toUpperCase();
  const valid = activeRooms.has(key);
  console.log("[Room Store] Validating room:", key, "->", valid, "Active rooms:", Array.from(activeRooms.keys()));
  return valid;
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
