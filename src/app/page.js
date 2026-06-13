"use client";
import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";

// ── Load Font Awesome once ───────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("fa-cdn")) {
  const link = document.createElement("link");
  link.id = "fa-cdn";
  link.rel = "stylesheet";
  link.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
  document.head.appendChild(link);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiJoin(role, roomCode) {
  await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, roomCode }),
  });
}

async function apiLeave(role, roomCode) {
  await fetch("/api/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, roomCode }),
  });
}

async function apiMessage(text, role, roomCode) {
  await fetch("/api/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, role, roomCode }),
  });
}

async function apiRegisterRoom(roomCode) {
  await fetch("/api/register-room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode }),
  });
}

async function apiValidateRoom(roomCode) {
  const res = await fetch("/api/validate-room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode }),
  });
  const data = await res.json();
  return data.valid === true;
}

const ROLES = [
  { id: "mafia", name: "Mafia", icon: "fa-skull", color: "#fc8181", bg: "rgba(229,62,62,0.12)", border: "rgba(229,62,62,0.45)", hoverBg: "rgba(229,62,62,0.05)", hoverBorder: "rgba(229,62,62,0.25)", desc: "Hidden in the shadows" },
  { id: "civilian", name: "Civilian", icon: "fa-person", color: "#60a5fa", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.45)", hoverBg: "rgba(59,130,246,0.05)", hoverBorder: "rgba(59,130,246,0.25)", desc: "Voice of the town" },
  { id: "detective", name: "Detective", icon: "fa-user-secret", color: "#c084fc", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.45)", hoverBg: "rgba(168,85,247,0.05)", hoverBorder: "rgba(168,85,247,0.25)", desc: "Seeking the truth" },
  { id: "doctor", name: "Doctor", icon: "fa-user-doctor", color: "#2dd4bf", bg: "rgba(45,212,191,0.12)", border: "rgba(45,212,191,0.45)", hoverBg: "rgba(45,212,191,0.05)", hoverBorder: "rgba(45,212,191,0.25)", desc: "Saving lives" }
];

// ── Shared background decorations ────────────────────────────────────────────
function BgDecorations() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(19,40,72,0.9) 0%, transparent 70%)",
        }}
      />
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
    </>
  );
}

// ── Lobby ────────────────────────────────────────────────────────────────────
function Lobby({ onEnter }) {
  // step: "role" | "create" | "join"
  const [step, setStep] = useState("role");
  const [role, setRole] = useState(null);
  const [createdCode, setCreatedCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [validating, setValidating] = useState(false);

  const handleCreateRoom = async () => {
    const code = generateRoomCode();
    setCreatedCode(code);
    setStep("create");
    // Register the code server-side so others can validate against it
    await apiRegisterRoom(code);
  };

  const handleCopy = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = async () => {
    const code = joinInput.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError("Code must be 6 characters");
      return;
    }
    setValidating(true);
    const valid = await apiValidateRoom(code);
    setValidating(false);
    if (!valid) {
      setJoinError("Please enter a valid code");
      return;
    }
    onEnter(role, code);
  };

  const isMafia = role === "mafia";

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
      <BgDecorations />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "22rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 8px #e53e3e" }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              Mafia vs Civilians
            </span>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 8px #e53e3e" }} />
          </div>

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
            Mafia Empire
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
          {/* ── Step: Role ── */}
          {step === "role" && (
            <>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1rem" }}>
                Select Role
              </p>

              {/* Role grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                {ROLES.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      style={{
                        background: isSelected ? r.bg : "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(10px)",
                        border: isSelected ? `1px solid ${r.border}` : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "0.875rem",
                        padding: "1rem 0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isSelected ? `0 0 24px ${r.bg.replace("0.12", "0.15")}` : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = r.hoverBorder;
                          e.currentTarget.style.background = r.hoverBg;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        }
                      }}
                    >
                      <i className={`fa-solid ${r.icon}`} style={{ fontSize: "1.4rem", color: isSelected ? r.color : "rgba(255,255,255,0.4)" }} />
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", color: isSelected ? r.color : "rgba(255,255,255,0.7)" }}>
                        {r.name}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.28)", textAlign: "center", lineHeight: 1.4 }}>
                        {r.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Create Room button */}
              <button
                onClick={() => role && handleCreateRoom()}
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  marginBottom: "0.625rem",
                }}
                onMouseEnter={(e) => {
                  if (role) {
                    e.currentTarget.style.transform = "scale(1.03)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <i className="fa-solid fa-plus" style={{ fontSize: "0.65rem" }} />
                Create Room
              </button>

              {/* Join Room button */}
              <button
                onClick={() => role && setStep("join")}
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
                  background: "rgba(255,255,255,0.04)",
                  color: role ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                  border: role ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: role ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
                onMouseEnter={(e) => {
                  if (role) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    e.currentTarget.style.transform = "scale(1.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = role ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <i className="fa-solid fa-right-to-bracket" style={{ fontSize: "0.65rem" }} />
                Join Room
              </button>
            </>
          )}

          {/* ── Step: Create ── */}
          {step === "create" && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep("role"); setCreatedCode(null); setCopied(false); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: 0,
                  marginBottom: "1.25rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.6rem" }} />
                Back
              </button>

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1rem" }}>
                Your Room Code
              </p>

              {/* Code display */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.875rem",
                  padding: "0.875rem 1rem",
                  marginBottom: "0.75rem",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.6rem",
                    letterSpacing: "0.3em",
                    color: "#fff",
                    userSelect: "all",
                  }}
                >
                  {createdCode}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copy code"
                  style={{
                    flexShrink: 0,
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.625rem",
                    background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
                    border: copied ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    color: copied ? "#4ade80" : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} style={{ fontSize: "0.8rem" }} />
                </button>
              </div>

              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.22)", marginBottom: "1.25rem" }}>
                Share this code with others so they can join your room.
              </p>

              {/* Enter Room */}
              <button
                onClick={() => onEnter(role, createdCode)}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "0.875rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#fff",
                  border: "1px solid rgba(59,130,246,0.5)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Enter Room →
              </button>
            </>
          )}

          {/* ── Step: Join ── */}
          {step === "join" && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep("role"); setJoinInput(""); setJoinError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: 0,
                  marginBottom: "1.25rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.6rem" }} />
                Back
              </button>

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1rem" }}>
                Enter Room Code
              </p>

              <input
                type="text"
                value={joinInput}
                onChange={(e) => {
                  setJoinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                  setJoinError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleJoinSubmit(); }}
                placeholder="------"
                maxLength={6}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: joinError ? "1px solid rgba(229,62,62,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.875rem",
                  padding: "0.875rem 1rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.4rem",
                  letterSpacing: "0.35em",
                  color: "#fff",
                  outline: "none",
                  caretColor: "#3b82f6",
                  textAlign: "center",
                  marginBottom: "0.5rem",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => { if (!joinError) e.target.style.borderColor = "rgba(59,130,246,0.4)"; }}
                onBlur={(e) => { if (!joinError) e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />

              {joinError && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "#fc8181", marginBottom: "0.75rem" }}>
                  {joinError}
                </p>
              )}

              <div style={{ height: joinError ? "0" : "1.25rem" }} />

              {/* Enter Room */}
              <button
                onClick={handleJoinSubmit}
                disabled={joinInput.length !== 6 || validating}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "0.875rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: joinInput.length === 6 && !validating ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "rgba(255,255,255,0.04)",
                  color: joinInput.length === 6 && !validating ? "#fff" : "rgba(255,255,255,0.2)",
                  border: joinInput.length === 6 && !validating ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: joinInput.length === 6 && !validating ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (joinInput.length === 6 && !validating) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {validating ? "Checking..." : "Enter Room →"}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.12)" }}>
          Warning: prolonged eye contact may result in elimination.
        </p>
      </div>
    </div>
  );
}

// ── Chat Room ────────────────────────────────────────────────────────────────
function ChatRoom({ role, roomCode, onExit }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pusherError, setPusherError] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const joinedRef = useRef(false);

  const pusherChannel = `room-${roomCode}`;

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.error("Pusher credentials missing in client environment!");
      setPusherError(true);
      return;
    }

    try {
      pusherRef.current = new Pusher(key, {
        cluster: cluster,
      });

      const channel = pusherRef.current.subscribe(pusherChannel);
      channelRef.current = channel;

      channel.bind("member-joined", (data) => {
        if (data && Array.isArray(data.members)) {
          setMembers(data.members);
        } else if (data) {
          setMembers((prev) => [...prev, { displayName: data.displayName, role: data.role }]);
        }
        setMessages((prev) => [
          ...prev,
          { type: "system", text: `${data?.displayName || "Someone"} joined the room`, timestamp: data?.timestamp || Date.now() },
        ]);
      });

      channel.bind("member-left", (data) => {
        if (data && Array.isArray(data.members)) {
          setMembers(data.members);
        } else if (data) {
          setMembers((prev) => {
            const idx = prev.findLastIndex((m) => m.role === data.role);
            if (idx === -1) return prev;
            const next = [...prev];
            next.splice(idx, 1);
            return next;
          });
        }
        setMessages((prev) => [
          ...prev,
          { type: "system", text: `${data?.displayName || "Someone"} left the room`, timestamp: data?.timestamp || Date.now() },
        ]);
      });

      channel.bind("new-message", (data) => {
        setMessages((prev) => [...prev, { ...data, type: "message" }]);
      });

      // Announce join once the Pusher subscription is fully live.
      // On fast connections subscription_succeeded may fire before we call
      // .bind(), so we also set a 300ms timeout as a guaranteed fallback.
      // A `joined` flag ensures apiJoin is called exactly once either way.
      if (!joinedRef.current) {
        joinedRef.current = true;
        let joined = false;
        const doJoin = () => {
          if (joined) return;
          joined = true;
          apiJoin(role, roomCode);
        };
        channel.bind("pusher:subscription_succeeded", doJoin);
        setTimeout(doJoin, 300);
      }

      return () => {
        channel.unbind_all();
        pusherRef.current.unsubscribe(pusherChannel);
        pusherRef.current.disconnect();
      };
    } catch (err) {
      console.error("Failed to initialize Pusher:", err);
      setPusherError(true);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleUnload = () => apiLeave(role, roomCode);
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [role, roomCode]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    await apiMessage(text, role, roomCode);
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
    await apiLeave(role, roomCode);
    onExit();
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });



  const currentRoleObj = ROLES.find((r) => r.id === role) || {
    name: "Unknown",
    icon: "fa-question",
    color: "#fff",
    bg: "rgba(255,255,255,0.1)",
    border: "rgba(255,255,255,0.2)"
  };

  if (pusherError) {
    return (
      <div
        style={{
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1.5rem",
          background: "#040d1a",
          color: "#fff",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#eab308" }} />
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.5rem" }}>
          Pusher Keys Missing
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", maxWidth: "24rem", lineHeight: 1.5 }}>
          Realtime chat requires Pusher credentials. Please verify your <strong>.env.local</strong> file has been configured with your keys.
        </p>
        <button
          onClick={onExit}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.875rem",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "0.8rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Return to Lobby
        </button>
      </div>
    );
  }

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

          {/* Title + room code */}
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
              Mafia Empire
            </div>
            {/* Room code subtle badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                marginTop: "0.2rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <i className="fa-solid fa-hashtag" style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.2)" }} />
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.62rem",
                  letterSpacing: "0.18em",
                  color: "rgba(255,255,255,0.28)",
                }}
              >
                {roomCode}
              </span>
            </div>
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
              background: currentRoleObj.bg,
              border: `1px solid ${currentRoleObj.border}`,
              color: currentRoleObj.color,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <i className={`fa-solid ${currentRoleObj.icon}`} style={{ fontSize: "0.65rem" }} />
            {currentRoleObj.name}
          </div>
        </div>
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
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.72rem",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.5)",
                    padding: "0.3rem 1rem",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {msg.text}
                </span>
              </div>
            );
          }

          const msgRoleObj = ROLES.find((r) => r.id === msg.role) || {
            color: "#60a5fa",
            border: "rgba(59,130,246,0.45)"
          };

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem", padding: "0 0.25rem" }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.08em", color: msgRoleObj.color }}>
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
                  borderLeft: `2px solid ${msgRoleObj.border}`,
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
                e.currentTarget.style.transform = "scale(1.03)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <i className="fa-solid fa-paper-plane" style={{ fontSize: "0.85rem" }} />
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: "0.5rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.13)" }}>
          Enter to send
        </p>
      </div>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("lobby");
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState(null);

  const handleEnter = (selectedRole, code) => {
    setRole(selectedRole);
    setRoomCode(code);
    setScreen("chat");
  };

  const handleExit = () => {
    setRole(null);
    setRoomCode(null);
    setScreen("lobby");
  };

  if (screen === "lobby") return <Lobby onEnter={handleEnter} />;
  return <ChatRoom role={role} roomCode={roomCode} onExit={handleExit} />;
}
