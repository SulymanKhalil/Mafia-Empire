import { NextResponse } from "next/server";
import { getPusherServer, getRoomChannel } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { roomCode, messageId, emoji, role, displayName } = await req.json();
    if (!roomCode || !messageId || !emoji) {
      return NextResponse.json({ error: "roomCode, messageId and emoji required" }, { status: 400 });
    }

    const pusher = getPusherServer();
    const channel = getRoomChannel(roomCode);

    await pusher.trigger(channel, "message-reaction", {
      messageId,
      emoji,
      role,
      displayName: displayName || "Someone",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reaction error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
