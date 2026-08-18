export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { roomCode, displayName, target } = await req.json();
    if (!roomCode || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.mafiaSelections) {
      room.mafiaSelections = {};
    }

    if (target === null || target === undefined) {
      delete room.mafiaSelections[displayName];
    } else {
      room.mafiaSelections[displayName] = target;
    }

    console.log(`[API Mafia Select] ${displayName} selected target: ${target}`);

    // Broadcast selection update exclusively on the Mafia channel
    const pusher = getPusherServer();
    const mafiaChannel = `presence-room-${roomCode.toUpperCase()}-mafia`;
    
    await pusher.trigger(mafiaChannel, "mafia-selection-updated", {
      mafiaSelections: room.mafiaSelections,
    });

    return NextResponse.json({ ok: true, mafiaSelections: room.mafiaSelections });
  } catch (err) {
    console.error("mafia-select error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
