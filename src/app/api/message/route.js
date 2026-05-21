import { NextResponse } from "next/server";
import { getPusherServer, CHANNEL } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { text, role } = await req.json();
    if (!text?.trim() || !role) {
      return NextResponse.json({ error: "text and role required" }, { status: 400 });
    }

    const displayName = role === "mafia" ? "Mafia" : "Civilian";
    const pusher = getPusherServer();

    await pusher.trigger(CHANNEL, "new-message", {
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
