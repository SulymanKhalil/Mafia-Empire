import { NextResponse } from "next/server";
import { getPusherServer, CHANNEL } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { role } = await req.json();
    if (!role) return NextResponse.json({ error: "role required" }, { status: 400 });

    const displayName = role === "mafia" ? "Mafia" : "Civilian";
    const pusher = getPusherServer();

    await pusher.trigger(CHANNEL, "member-joined", {
      displayName,
      role,
      timestamp: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("join error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
