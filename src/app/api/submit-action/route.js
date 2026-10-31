export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(req) {
  try {
    const { roomCode, displayName, role, target } = await req.json();
    if (!roomCode || !displayName || !role || !target) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prevent self-voting
    if (target === displayName) {
      return NextResponse.json({ error: "Self-voting is not allowed." }, { status: 400 });
    }

    const room = getRoom(roomCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Record the action
    room.actions[displayName] = { role, target };
    console.log(`[API Submit Action] Recorded action from ${displayName} (${role}) -> target: ${target}`);

    const pusher = getPusherServer();
    const channelName = `presence-room-${roomCode.toUpperCase()}`;

    // Broadcast that this player submitted their action (without revealing choice or role)
    await pusher.trigger(channelName, "action-submitted", {
      displayName,
    });

    let detectiveResult = null;

    // Resolve Detective's action privately
    if (role === "detective") {
      const targetPlayer = room.activePlayers.find(p => p.displayName === target);
      const isMafia = targetPlayer ? targetPlayer.role === "mafia" : false;
      detectiveResult = { isMafia };
      console.log(`[API Submit Action] Detective checked ${target} -> isMafia: ${isMafia}`);
    }

    // Check if all active players have submitted
    const totalActive = room.activePlayers.length;
    const totalSubmitted = Object.keys(room.actions).length;

    console.log(`[API Submit Action] Room ${roomCode} actions progress: ${totalSubmitted}/${totalActive}`);

    if (totalSubmitted >= totalActive && totalActive > 0) {
      console.log(`[API Submit Action] All players submitted in room ${roomCode}. Resolving actions...`);

      // 1. Resolve Mafia elimination target (majority consensus)
      const mafiaActions = Object.values(room.actions).filter(a => a.role === "mafia");
      const votes = {};
      mafiaActions.forEach(act => {
        if (act.target) {
          votes[act.target] = (votes[act.target] || 0) + 1;
        }
      });

      let mafiaTarget = null;
      let maxVotes = 0;
      for (const t in votes) {
        if (votes[t] > maxVotes) {
          maxVotes = votes[t];
          mafiaTarget = t;
        }
      }

      // 2. Resolve Doctor protection target
      const doctorAction = Object.values(room.actions).find(a => a.role === "doctor");
      const doctorTarget = doctorAction ? doctorAction.target : null;

      // 3. Resolve Detective target
      const detectiveAction = Object.values(room.actions).find(a => a.role === "detective");
      const detectiveTarget = detectiveAction ? detectiveAction.target : null;

      // 4. Compare Mafia target and Doctor target
      let resultMessage = "No one was eliminated.";
      if (mafiaTarget) {
        if (mafiaTarget === doctorTarget) {
          resultMessage = `${mafiaTarget} was protected.`;
        } else {
          resultMessage = `${mafiaTarget} was eliminated.`;
        }
      }

      room.resolvedResult = resultMessage;

      // 5. Append round history
      if (!room.history) {
        room.history = [];
      }
      const roundNum = room.history.length + 1;
      
      const detectiveIsMafia = detectiveTarget 
        ? (room.activePlayers.find(p => p.displayName === detectiveTarget)?.role === "mafia")
        : false;

      const historyItem = {
        round: roundNum,
        mafiaResult: resultMessage,
        doctorSave: doctorTarget ? "Doctor protection was recorded." : "No protection occurred.",
        detectiveGuess: detectiveTarget ? "Detective investigation was recorded." : "No investigation occurred.",
        civilianSuspicion: "Civilian suspicions were recorded.",
        // For private Detective history view
        detectivePrivate: detectiveTarget ? {
          target: detectiveTarget,
          isMafia: detectiveIsMafia
        } : null
      };
      
      room.history.push(historyItem);

      console.log(`[API Submit Action] Resolution for ${roomCode}: ${resultMessage}`);

      // Broadcast resolution to all players
      await pusher.trigger(channelName, "actions-resolved", {
        resultMessage,
        history: room.history,
      });
    }

    return NextResponse.json({
      ok: true,
      ...(detectiveResult !== null && { isMafia: detectiveResult.isMafia })
    });
  } catch (err) {
    console.error("submit-action error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
