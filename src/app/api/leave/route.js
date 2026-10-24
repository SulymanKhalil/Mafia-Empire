import { NextResponse } from "next/server";
import { removeMember } from "@/lib/room-store";

export async function POST(req) {
  try {
    const { roomCode, displayName, role } = await req.json();
    if (roomCode) {
      removeMember(roomCode, role, displayName);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: true });
  }
}
