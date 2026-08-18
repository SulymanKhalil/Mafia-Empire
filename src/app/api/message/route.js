import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { text, role, roomCode, displayName: customName, messageId, isMafiaChat } = await req.json();
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
    
    // Ensure only Mafia can send messages to the private Mafia chat
    if (isMafiaChat && role !== "mafia") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pusher = getPusherServer();
    const channelName = isMafiaChat 
      ? `presence-room-${roomCode.toUpperCase()}-mafia`
      : `presence-room-${roomCode.toUpperCase()}`;

    const eventName = isMafiaChat ? "new-mafia-message" : "new-message";

    await pusher.trigger(channelName, eventName, {
      id: messageId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: displayName,
      role,
      text: text.trim(),
      timestamp: Date.now(),
      isMafiaChat: !!isMafiaChat,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("message error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
