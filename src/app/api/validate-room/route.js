import { NextResponse } from "next/server";
import { isValidRoom } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { roomCode } = await req.json();
    if (!roomCode) return NextResponse.json({ valid: false });
    return NextResponse.json({ valid: isValidRoom(roomCode) });
  } catch (err) {
    console.error("validate-room error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
