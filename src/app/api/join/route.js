import { NextResponse } from "next/server";
import { getPusherServer, getRoomChannel } from "@/lib/pusher-server";
import { addMember, getMembers } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { role, roomCode, displayName: customName } = await req.json();
    if (!role) return NextResponse.json({ error: "role required" }, { status: 400 });
    if (!roomCode) return NextResponse.json({ error: "roomCode required" }, { status: 400 });

    const roleNames = {
      mafia: "Mafia",
      civilian: "Civilian",
      detective: "Detective",
      doctor: "Doctor"
    };
    const displayName = customName?.trim() || roleNames[role] || "Unknown";
    addMember(roomCode, { role, displayName });

    const pusher = getPusherServer();
    const channel = getRoomChannel(roomCode);

    await pusher.trigger(channel, "member-joined", {
      displayName,
      role,
      timestamp: Date.now(),
      members: getMembers(roomCode),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("join error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
