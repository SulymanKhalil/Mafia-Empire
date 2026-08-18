export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { roomCode, members } = await req.json();
    if (!roomCode || !members || !Array.isArray(members)) {
      return NextResponse.json({ error: "roomCode and members array required" }, { status: 400 });
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Reset round states on the server
    room.activePlayers = members;
    room.actions = {};
    room.resolvedResult = null;
    room.mafiaSelections = {};

    console.log(`[API Start Round] Round started for room ${roomCode} with ${members.length} players.`);

    // Notify all players that the action round has started
    const pusher = getPusherServer();
    const channelName = `presence-room-${roomCode.toUpperCase()}`;
    await pusher.trigger(channelName, "round-started", {
      activePlayers: members,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("start-round API error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
