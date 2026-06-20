import { NextResponse } from "next/server";
import { getPusherServer, getRoomChannel } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { role, roomCode, displayName, isTyping } = await req.json();
    if (!roomCode) return NextResponse.json({ error: "roomCode required" }, { status: 400 });

    const pusher = getPusherServer();
    const channel = getRoomChannel(roomCode);

    await pusher.trigger(channel, "typing-update", {
      role,
      displayName: displayName || "Someone",
      isTyping: !!isTyping,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("typing error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
