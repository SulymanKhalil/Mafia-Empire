import { NextResponse } from "next/server";
import { registerRoom } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { roomCode } = await req.json();
    console.log("[API Register Room] Creating room code:", roomCode);
    if (!roomCode) return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    registerRoom(roomCode);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("register-room error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
