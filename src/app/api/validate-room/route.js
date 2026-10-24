import { NextResponse } from "next/server";
import { isValidRoom } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { roomCode, role } = await req.json();
    console.log("[API Validate Room] Validating code:", roomCode, "role:", role);
    if (!roomCode) return NextResponse.json({ valid: false, error: "Room code required" });
    
    const result = await isValidRoom(roomCode, role);
    return NextResponse.json(result);
  } catch (err) {
    console.error("validate-room error:", err);
    return NextResponse.json({ error: "server error", valid: false }, { status: 500 });
  }
}
