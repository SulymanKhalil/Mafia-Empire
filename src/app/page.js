"use client";
import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";

const CHANNEL = "night-syndicate";

// ── Load Font Awesome once ───────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("fa-cdn")) {
  const link = document.createElement("link");
  link.id = "fa-cdn";
  link.rel = "stylesheet";
  link.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
  document.head.appendChild(link);
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiJoin(role) {
  await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

async function apiLeave(role) {
  await fetch("/api/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

async function apiMessage(text, role) {
  await fetch("/api/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, role }),
  });
}

// ── Lobby ────────────────────────────────────────────────────────────────────
function Lobby({ onEnter }) {
  const [role, setRole] = useState(null);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "#040d1a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(19,40,72,0.9) 0%, transparent 70%)",
        }}
      />
      {/* Grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.05,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "22rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 8px #e53e3e" }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              Night Room Active
            </span>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 8px #e53e3e" }} />
          </div>

          {/* Site title */}
          <h1
            style={{
              fontFamily: "'Abril Fatface', serif",
              fontWeight: 400,
              fontSize: "2.75rem",
              lineHeight: 1,
              letterSpacing: "0.01em",
              background: "linear-gradient(135deg, #ffffff 0%, #94b8db 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "0.5rem",
            }}
          >
            Night Syndicate
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>
            Choose your allegiance. Enter the room.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(10,22,40,0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
          }}
        >
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1rem" }}>
            Select Role
          </p>

          {/* Role grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {/* Mafia */}
            <button
              onClick={() => setRole("mafia")}
              style={{
                background: role === "mafia" ? "rgba(229,62,62,0.12)" : "rgba(255,255,255,0.03)",
                backdropFilter: "blur(10px)",
                border: role === "mafia" ? "1px solid rgba(229,62,62,0.45)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: "0.875rem",
                padding: "1rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: role === "mafia" ? "0 0 24px rgba(229,62,62,0.15)" : "none",
              }}
              onMouseEnter={(e) => {
                if (role !== "mafia") {
                  e.currentTarget.style.borderColor = "rgba(229,62,62,0.25)";
                  e.currentTarget.style.background = "rgba(229,62,62,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (role !== "mafia") {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
            >
              <i className="fa-solid fa-skull" style={{ fontSize: "1.4rem", color: role === "mafia" ? "#fc8181" : "rgba(255,255,255,0.4)" }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", color: role === "mafia" ? "#fc8181" : "rgba(255,255,255,0.7)" }}>
                Mafia
              </span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.28)", textAlign: "center", lineHeight: 1.4 }}>
                Hidden in the shadows
              </span>
            </button>

            {/* Civilian */}
            <button
              onClick={() => setRole("civilian")}
              style={{
                background: role === "civilian" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                backdropFilter: "blur(10px)",
                border: role === "civilian" ? "1px solid rgba(59,130,246,0.45)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: "0.875rem",
                padding: "1rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: role === "civilian" ? "0 0 24px rgba(59,130,246,0.15)" : "none",
              }}
              onMouseEnter={(e) => {
                if (role !== "civilian") {
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)";
                  e.currentTarget.style.background = "rgba(59,130,246,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (role !== "civilian") {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
            >
              <i className="fa-solid fa-person" style={{ fontSize: "1.4rem", color: role === "civilian" ? "#60a5fa" : "rgba(255,255,255,0.4)" }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", color: role === "civilian" ? "#60a5fa" : "rgba(255,255,255,0.7)" }}>
                Civilian
              </span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.28)", textAlign: "center", lineHeight: 1.4 }}>
                Voice of the town
              </span>
            </button>
          </div>

          {/* Enter */}
          <button
            onClick={() => role && onEnter(role)}
            disabled={!role}
            style={{
              width: "100%",
              padding: "0.875rem",
              borderRadius: "0.875rem",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.8rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: role ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "rgba(255,255,255,0.04)",
              color: role ? "#fff" : "rgba(255,255,255,0.2)",
              border: role ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
              cursor: role ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (role) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Enter Room →
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.12)" }}>
          Anonymous · No records · Night room
        </p>
      </div>
    </div>
  );
}

// ── Chat Room ────────────────────────────────────────────────────────────────
function ChatRoom({ role, onExit }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    // Init Pusher
    pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusherRef.current.subscribe(CHANNEL);
    channelRef.current = channel;

    channel.bind("member-joined", (data) => {
      setMembers((prev) => {
        const next = [...prev, { displayName: data.displayName, role: data.role }];
        return next;
      });
      setMessages((prev) => [
        ...prev,
        { type: "system", text: `${data.displayName} joined the room`, timestamp: data.timestamp },
      ]);
    });

    channel.bind("member-left", (data) => {
      setMembers((prev) => {
        const idx = prev.findLastIndex((m) => m.role === data.role);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      });
      setMessages((prev) => [
        ...prev,
        { type: "system", text: `${data.displayName} left the room`, timestamp: data.timestamp },
      ]);
    });

    channel.bind("new-message", (data) => {
      setMessages((prev) => [...prev, { ...data, type: "message" }]);
    });

    // Join once
    if (!joinedRef.current) {
      joinedRef.current = true;
      apiJoin(role);
    }

    return () => {
      channel.unbind_all();
      pusherRef.current.unsubscribe(CHANNEL);
      pusherRef.current.disconnect();
    };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Leave on tab close
  useEffect(() => {
    const handleUnload = () => apiLeave(role);
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [role]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    await apiMessage(text, role);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExit = async () => {
    await apiLeave(role);
    onExit();
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const mafiaCount = members.filter((m) => m.role === "mafia").length;
  const civilianCount = members.filter((m) => m.role === "civilian").length;
  const isMafia = role === "mafia";

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#040d1a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 100% 35% at 50% 0%, rgba(19,40,72,0.7) 0%, transparent 60%)",
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          background: "rgba(6,15,33,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "0.75rem 1rem", gap: "0.75rem" }}>
          {/* Exit */}
          <button
            onClick={handleExit}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "0.625rem",
              padding: "0.375rem 0.75rem",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.45)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(229,62,62,0.1)";
              e.currentTarget.style.borderColor = "rgba(229,62,62,0.3)";
              e.currentTarget.style.color = "#fc8181";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "rgba(255,255,255,0.45)";
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.65rem" }} />
            Exit
          </button>

          {/* Title */}
          <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Abril Fatface', serif",
                fontWeight: 400,
                fontSize: "1.05rem",
                letterSpacing: "0.03em",
                background: "linear-gradient(135deg, #ffffff 0%, #7fa8d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Night Syndicate
            </div>
            {/* <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", marginTop: "0.125rem" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.28)" }}>
                {members.length} online
              </span>
            </div> */}
          </div>

          {/* Role badge */}
          <div
            style={{
              flexShrink: 0,
              padding: "0.375rem 0.75rem",
              borderRadius: "0.625rem",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.05em",
              background: isMafia ? "rgba(229,62,62,0.14)" : "rgba(59,130,246,0.14)",
              border: isMafia ? "1px solid rgba(229,62,62,0.35)" : "1px solid rgba(59,130,246,0.35)",
              color: isMafia ? "#fc8181" : "#60a5fa",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <i className={`fa-solid ${isMafia ? "fa-skull" : "fa-person"}`} style={{ fontSize: "0.65rem" }} />
            {isMafia ? "Mafia" : "Civilian"}
          </div>
        </div>

        {/* Members row */}
        {members.length > 0 && (
          <div style={{ padding: "0 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", overflowX: "auto", scrollbarWidth: "none" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
              Room:
            </span>
            {mafiaCount > 0 && (
              <span style={{ flexShrink: 0, padding: "0.25rem 0.625rem", borderRadius: "999px", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.68rem", background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.2)", color: "#fc8181", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <i className="fa-solid fa-skull" style={{ fontSize: "0.6rem" }} />
                Mafia ×{mafiaCount}
              </span>
            )}
            {civilianCount > 0 && (
              <span style={{ flexShrink: 0, padding: "0.25rem 0.625rem", borderRadius: "999px", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.68rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <i className="fa-solid fa-person" style={{ fontSize: "0.6rem" }} />
                Civilian ×{civilianCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1rem", color: "rgba(255,255,255,0.12)" }}>
              The room is quiet.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.08)" }}>
              Be the first to speak.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.type === "system") {
            return (
              <div key={i} style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", fontStyle: "italic", color: "rgba(255,255,255,0.25)", padding: "0.25rem 0.875rem", borderRadius: "999px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {msg.text}
                </span>
              </div>
            );
          }

          const msgIsMafia = msg.role === "mafia";

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem", padding: "0 0.25rem" }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.08em", color: msgIsMafia ? "#fc8181" : "#60a5fa" }}>
                  {msg.sender}
                </span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.18)" }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div
                style={{
                  display: "inline-block",
                  width: "fit-content",
                  maxWidth: "min(75vw, 480px)",
                  alignSelf: "flex-start",
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "0.75rem",
                  borderTopLeftRadius: "0.25rem",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderLeft: msgIsMafia ? "2px solid rgba(229,62,62,0.45)" : "2px solid rgba(59,130,246,0.45)",
                  padding: "0.625rem 0.875rem",
                }}
              >
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", lineHeight: 1.55, color: "rgba(255,255,255,0.85)", margin: 0, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div
        style={{
          background: "rgba(6,15,33,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          padding: "0.75rem 1rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            maxLength={500}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.85)",
              outline: "none",
              caretColor: "#3b82f6",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(59,130,246,0.4)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              flexShrink: 0,
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: input.trim() ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "rgba(255,255,255,0.04)",
              border: input.trim() ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
              color: input.trim() ? "#fff" : "rgba(255,255,255,0.2)",
              cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (input.trim()) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <i className="fa-solid fa-paper-plane" style={{ fontSize: "0.85rem" }} />
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: "0.5rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.13)" }}>
          Enter to send · Anonymous messaging
        </p>
      </div>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("lobby");
  const [role, setRole] = useState(null);

  const handleEnter = (selectedRole) => {
    setRole(selectedRole);
    setScreen("chat");
  };

  const handleExit = () => {
    setRole(null);
    setScreen("lobby");
  };

  if (screen === "lobby") return <Lobby onEnter={handleEnter} />;
  return <ChatRoom role={role} onExit={handleExit} />;
}
