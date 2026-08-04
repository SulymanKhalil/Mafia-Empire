import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const data = await req.formData();
    const socketId = data.get("socket_id");
    const channelName = data.get("channel_name");
    const displayName = data.get("displayName");
    const role = data.get("role");

    console.log("[Pusher Auth] channelName:", channelName, "displayName:", displayName, "role:", role);

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
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
    return NextResponse.json(authResponse);
  } catch (err) {
    console.error("[Pusher Auth] Error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
