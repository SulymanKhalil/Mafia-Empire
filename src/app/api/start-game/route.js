export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { roomCode, displayName, members } = await req.json();
    if (!roomCode || !displayName || !members || !Array.isArray(members)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Verify creator status
    if (displayName !== room.creatorName) {
      return NextResponse.json({ error: "Only the Room Creator can start the game." }, { status: 403 });
    }

    // Validate role counts for Advanced Game
    const mafiaCount = members.filter(m => m.role === 'mafia').length;
    const civilianCount = members.filter(m => m.role === 'civilian').length;
    const detectiveCount = members.filter(m => m.role === 'detective').length;
    const doctorCount = members.filter(m => m.role === 'doctor').length;

    if (mafiaCount < 1) {
      return NextResponse.json({ error: "At least 1 Mafia player is required to start the game." });
    }
    if (mafiaCount > 3) {
      return NextResponse.json({ error: `Maximum 3 Mafia players allowed (Currently: ${mafiaCount}).` });
    }
    if (civilianCount < 4) {
      return NextResponse.json({ error: `At least 4 Civilian players are required to start the game (Currently: ${civilianCount}).` });
    }
    if (detectiveCount > 1) {
      return NextResponse.json({ error: `Detective limit exceeded: Max 1 player (Currently: ${detectiveCount}).` });
    }
    if (doctorCount > 1) {
      return NextResponse.json({ error: `Doctor limit exceeded: Max 1 player (Currently: ${doctorCount}).` });
    }

    // Start the game
    room.isGameStarted = true;
    room.activePlayers = members.map(m => ({ displayName: m.displayName, role: m.role }));
    room.actions = {};
    room.resolvedResult = null;
    room.mafiaSelections = {};

    console.log(`[API Start Game] Game started successfully for room ${roomCode} by ${displayName}`);

    // Broadcast to all players in the room
    const pusher = getPusherServer();
    const channelName = `presence-room-${roomCode.toUpperCase()}`;
    await pusher.trigger(channelName, "game-started", {
      activePlayers: room.activePlayers,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("start-game API error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
