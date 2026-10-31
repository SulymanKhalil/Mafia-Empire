import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";
import { releaseMafiaReservation, reserveMafiaSlot } from "@/lib/room-store";

export async function POST(req) {
  try {
    const data = await req.formData();
    const socketId = data.get("socket_id");
    const channelName = data.get("channel_name");
    const role = data.get("role");

    console.log("[Pusher Auth] channelName:", channelName, "role:", role);

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }
    if (channelName.startsWith("presence-") && role !== "mafia" && role !== "civilian") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const pusher = getPusherServer();

    let presenceData = undefined;
    if (channelName.startsWith("presence-")) {
      if (role === "mafia" && channelName.startsWith("presence-room-")) {
        const roomCode = channelName.slice("presence-room-".length);
        const reserved = await reserveMafiaSlot(roomCode, socketId, async () => {
          const response = await pusher.get({
            path: `/channels/${channelName}/users`,
          });
          if (response.status === 404) return new Set();
          if (response.status !== 200) {
            throw new Error(`Failed to check room members: ${response.status}`);
          }

          const { users = [] } = await response.json();
          return new Set(users.map((user) => user.id));
        });
        if (!reserved) {
          return NextResponse.json(
            { error: "This room already has a Mafia. Only one Mafia player is allowed per room." },
            { status: 403 }
          );
        }
      }

      presenceData = {
        user_id: socketId,
        user_info: {
          role: role || "civilian",
        },
      };
    }

    try {
      const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(authResponse);
    } catch (err) {
      if (role === "mafia" && channelName.startsWith("presence-room-")) {
        await releaseMafiaReservation(channelName.slice("presence-room-".length), socketId);
      }
      throw err;
    }
  } catch (err) {
    console.error("[Pusher Auth] Error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
