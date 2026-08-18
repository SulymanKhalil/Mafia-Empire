import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";
import { occupyRoom } from "@/lib/room-store";

export async function POST(req) {
  try {
    const data = await req.formData();
    const socketId = data.get("socket_id");
    const channelName = data.get("channel_name");
    const displayName = data.get("displayName");
    const role = data.get("role");
    const gameMode = data.get("gameMode");
    const creatorName = data.get("creatorName");

    console.log("[Pusher Auth] channelName:", channelName, "displayName:", displayName, "role:", role, "gameMode:", gameMode, "creatorName:", creatorName);

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    // Secure the Mafia private chat channel
    if (channelName.endsWith("-mafia")) {
      if (role !== "mafia") {
        console.warn("[Pusher Auth] Blocked non-mafia attempt to join mafia channel:", displayName, "role:", role);
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const pusher = getPusherServer();

    let presenceData = undefined;
    if (channelName.startsWith("presence-")) {
      presenceData = {
        user_id: socketId,
        user_info: {
          displayName: displayName || "Unknown",
          role: role || "civilian",
        },
      };
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    
    // Mark room as occupied if it is a room presence channel (either main or mafia channel)
    if (channelName.startsWith("presence-room-")) {
      const cleanName = channelName.replace("-mafia", "");
      const roomCode = cleanName.substring("presence-room-".length);
      occupyRoom(roomCode, gameMode, creatorName);
    }

    return NextResponse.json(authResponse);
  } catch (err) {
    console.error("[Pusher Auth] Error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
