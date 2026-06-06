// In-memory store of active room codes.
// Lives for the lifetime of the server process — fine for a single-instance deployment.
const activeCodes = new Set();

export function registerRoom(code) {
  activeCodes.add(code.toUpperCase());
}

export function isValidRoom(code) {
  return activeCodes.has(code.toUpperCase());
}
