import { NextResponse } from "next/server";
import { registerRoom } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { roomCode, gameMode, creatorName } = await req.json();
    console.log("[API Register Room] Creating room code:", roomCode, "mode:", gameMode, "creator:", creatorName);
    if (!roomCode) return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    
    registerRoom(roomCode, gameMode || "simple_game", creatorName || "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("register-room error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
