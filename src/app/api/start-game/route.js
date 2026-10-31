export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { roomCode, displayName, members } = await req.json();
    if (!roomCode || !displayName) {
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

    let activePlayers = [];
    if (Array.isArray(members) && members.length > 0) {
      activePlayers = members.map(m => ({ displayName: m.displayName, role: m.role }));
    } else if (Array.isArray(room.members) && room.members.length > 0) {
      activePlayers = room.members.map(m => ({ displayName: m.displayName, role: m.role }));
    } else {
      return NextResponse.json({ error: "No players in room to start the game." }, { status: 400 });
    }

    // Validate role counts
    const mafiaCount = activePlayers.filter(m => m.role === 'mafia').length;
    const civilianCount = activePlayers.filter(m => m.role === 'civilian').length;
    const doctorCount = activePlayers.filter(m => m.role === 'doctor').length;
    const detectiveCount = activePlayers.filter(m => m.role === 'detective').length;

    if (mafiaCount < 1) {
      return NextResponse.json({ error: "At least 1 Mafia player is required to start the game." });
    }
    if (mafiaCount > 3) {
      return NextResponse.json({ error: `Maximum 3 Mafia players allowed (Currently: ${mafiaCount}).` });
    }
    if (civilianCount < 4) {
      return NextResponse.json({ error: `At least 4 Civilian players are required to start the game (Currently: ${civilianCount}/4).` });
    }
    if (doctorCount > 1) {
      return NextResponse.json({ error: `Doctor limit exceeded: Maximum 1 player (Currently: ${doctorCount}).` });
    }
    if (detectiveCount > 1) {
      return NextResponse.json({ error: `Detective / Investigator limit exceeded: Maximum 1 player (Currently: ${detectiveCount}).` });
    }

    // Start the game
    room.isGameStarted = true;
    room.activePlayers = activePlayers;
    room.actions = {};
    room.resolvedResult = null;
    room.mafiaSelections = {};

    console.log(`[API Start Game] Game started successfully for room ${roomCode} by ${displayName}`);

    // Broadcast to all players in the room - names only, preserving complete secret role privacy
    const pusher = getPusherServer();
    const channelName = `presence-room-${roomCode.toUpperCase()}`;
    await pusher.trigger(channelName, "game-started", {
      activePlayers: activePlayers.map(p => ({ displayName: p.displayName })),
    });

    const myRole = activePlayers.find(p => p.displayName === displayName)?.role || "civilian";

    return NextResponse.json({ ok: true, role: myRole });
  } catch (err) {
    console.error("start-game API error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
