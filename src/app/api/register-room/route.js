import { NextResponse } from "next/server";
import { registerRoom } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { roomCode, creatorName } = await req.json();
    console.log("[API Register Room] Creating room code:", roomCode, "creator:", creatorName);
    if (!roomCode) return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    
    registerRoom(roomCode, "standard", creatorName || "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("register-room error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
