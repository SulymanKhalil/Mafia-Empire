import { NextResponse } from "next/server";
import { isValidRoom } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { roomCode } = await req.json();
    console.log("[API Validate Room] Validating code:", roomCode);
    if (!roomCode) return NextResponse.json({ valid: false });
    const valid = isValidRoom(roomCode);
    return NextResponse.json({ valid });
  } catch (err) {
    console.error("validate-room error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
