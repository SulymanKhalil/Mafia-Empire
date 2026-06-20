import { NextResponse } from "next/server";
import { getPusherServer, getRoomChannel } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { text, role, roomCode, displayName: customName, messageId } = await req.json();
    if (!text?.trim() || !role) {
      return NextResponse.json({ error: "text and role required" }, { status: 400 });
    }
    if (!roomCode) return NextResponse.json({ error: "roomCode required" }, { status: 400 });

    const roleNames = {
      mafia: "Mafia",
      civilian: "Civilian",
      detective: "Detective",
      doctor: "Doctor"
    };
    const displayName = customName?.trim() || roleNames[role] || "Unknown";
    const pusher = getPusherServer();
    const channel = getRoomChannel(roomCode);

    await pusher.trigger(channel, "new-message", {
      id: messageId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
