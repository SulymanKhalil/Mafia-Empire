export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    if (!roomCode) {
      return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      gameMode: room.gameMode,
      activePlayers: room.activePlayers || [],
      submittedPlayers: room.actions ? Object.keys(room.actions) : [],
      resolvedResult: room.resolvedResult || null,
    });
  } catch (err) {
    console.error("room-state API error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
