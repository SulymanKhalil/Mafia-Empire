import { NextResponse } from "next/server";
import { getPusherServer, getRoomChannel } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { text, role, roomCode } = await req.json();
    if (!text?.trim() || !role) {
      return NextResponse.json({ error: "text and role required" }, { status: 400 });
    }
    if (!roomCode) return NextResponse.json({ error: "roomCode required" }, { status: 400 });

    const displayName = role === "mafia" ? "Mafia" : "Civilian";
    const pusher = getPusherServer();
    const channel = getRoomChannel(roomCode);

    await pusher.trigger(channel, "new-message", {
      sender: displayName,
      role,
      text: text.trim(),
      timestamp: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("message error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
