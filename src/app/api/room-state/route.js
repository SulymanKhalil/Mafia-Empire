export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    const displayName = searchParams.get("displayName");

    if (!roomCode) {
      return NextResponse.json({ error: "roomCode required" }, { status: 400 });
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    let myRole = null;
    if (displayName) {
      const activeP = (room.activePlayers || []).find(p => p.displayName === displayName);
      const memberP = (room.members || []).find(m => m.displayName === displayName);
      myRole = activeP?.role || memberP?.role || null;
    }

    // Role privacy: activePlayers returned to client only contain displayNames
    const sanitizedActivePlayers = (room.activePlayers || []).map(p => ({
      displayName: p.displayName,
    }));

    return NextResponse.json({
      gameMode: room.gameMode,
      isGameStarted: !!room.isGameStarted,
      myRole,
      activePlayers: sanitizedActivePlayers,
      submittedPlayers: room.actions ? Object.keys(room.actions) : [],
      resolvedResult: room.resolvedResult || null,
      mafiaSelections: myRole === "mafia" ? (room.mafiaSelections || {}) : {},
    });
  } catch (err) {
    console.error("room-state API error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
