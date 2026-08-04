"use client";
import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";

// ── Load Font Awesome + Global Styles ───────────────────────────────────────
if (typeof document !== "undefined") {
  if (!document.getElementById("fa-cdn")) {
    const link = document.createElement("link");
    link.id = "fa-cdn";
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    document.head.appendChild(link);
  }

  if (!document.getElementById("keyframes-style")) {
    const style = document.createElement("style");
    style.id = "keyframes-style";
    style.textContent = `
      @keyframes particle-drift {
        0% { transform: translateY(0) translateX(0); opacity: 0.55; }
        25% { opacity: 0.7; }
        75% { opacity: 0.4; }
        100% { transform: translateY(-100dvh) translateX(25px); opacity: 0; }
      }
      @keyframes message-slide-in {
        from { opacity: 0; transform: translateX(-8px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes message-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes typing-pulse {
        0%, 60%, 100% { opacity: 0.4; }
        30% { opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
      .message-bubble {
        animation: message-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .system-message {
        animation: message-fade-in 0.4s ease;
      }
      .typing-indicator > span {
        animation: typing-pulse 1.4s infinite;
      }
      .typing-indicator > span:nth-child(2) {
        animation-delay: 0.2s;
      }
      .typing-indicator > span:nth-child(3) {
        animation-delay: 0.4s;
      }
      @media (max-width: 640px) {
        .room-header { font-size: 0.9rem; }
        .message-bubble { max-width: 85vw; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateRoomCode() {
  const chars = "0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function RoomCodeDisplay({ code, size = "sm" }) {
  const isSm = size === "sm";
  const chars = (code || "----").split("");
  const fontSize = isSm ? "0.65rem" : "0.95rem";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${chars.length}, minmax(0, 1fr))`,
        gap: isSm ? "0.3rem" : "0.45rem",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {chars.map((char, idx) => (
        <div
          key={idx}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            borderRadius: "0.4rem",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize,
            color: "#ffffff",
            letterSpacing: "0.08em",
            transition: "all 0.2s ease",
            boxShadow: "none",
            minWidth: 0,
            maxWidth: "2.5rem",
            justifySelf: "center",
          }}
        >
          {char}
        </div>
      ))}
    </div>
  );
}

function ParticleField({ count = 18 }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, idx) => {
        const left = `${(idx * 13) % 100}%`;
        const top = `${(idx * 17 + 7) % 100}%`;
        const size = 4 + ((idx * 3) % 6);
        const delay = `${(idx * 0.75) % 14}s`;
        return (
          <span
            key={idx}
            className="particle"
            style={{
              position: "absolute",
              left,
              top,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: "999px",
              background: "rgba(255,255,255,0.14)",
              opacity: 0.55,
              animation: "particle-drift 14s linear infinite",
              animationDelay: delay,
            }}
          />
        );
      })}
    </div>
  );
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiJoin(role, roomCode, displayName) {
  await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, roomCode, displayName }),
  });
}

async function apiLeave(role, roomCode, displayName) {
  await fetch("/api/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, roomCode, displayName }),
  });
}

async function apiMessage(text, role, roomCode, displayName) {
  await fetch("/api/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, role, roomCode, displayName }),
  });
}

async function apiTyping(role, roomCode, displayName, isTyping) {
  await fetch("/api/typing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, roomCode, displayName, isTyping }),
  });
}

async function apiReaction(role, roomCode, messageId, emoji, displayName) {
  await fetch("/api/reaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, roomCode, messageId, emoji, displayName }),
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
  { id: "civilian", name: "Civilian", icon: "fa-person", color: "#38bdf8", bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.45)", hoverBg: "rgba(14,165,233,0.05)", hoverBorder: "rgba(14,165,233,0.25)", desc: "Voice of the town" },
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
          background: "none",
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
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nextAction, setNextAction] = useState(null);
  const [createdCode, setCreatedCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [validating, setValidating] = useState(false);

  const trimmedName = displayName.trim();
  const canProceed = trimmedName.length >= 2;

  const handleCreateRoom = async () => {
    const code = generateRoomCode();
    setCreatedCode(code);
    setStep("create");
    setNextAction(null);
    // Register the code server-side so others can validate against it
    await apiRegisterRoom(code);
  };

  const handleChooseCreate = () => {
    if (!role) return;
    setNextAction("create");
    setStep("name");
    setNameError("");
  };

  const handleChooseJoin = () => {
    if (!role) return;
    setNextAction("join");
    setStep("name");
    setNameError("");
  };

  const handleNameContinue = async () => {
    if (!canProceed) {
      setNameError("Choose a display name with at least 2 characters.");
      return;
    }

    if (nextAction === "create") {
      await handleCreateRoom();
      return;
    }

    if (nextAction === "join") {
      setStep("join");
      return;
    }

    setNameError("Please pick Create or Join first.");
  };

  const handleCopy = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = async () => {
    const code = joinInput.trim();
    if (code.length !== 4) {
      setJoinError("Code must be 4 digits");
      return;
    }
    setValidating(true);
    const valid = await apiValidateRoom(code);
    setValidating(false);
    if (!valid) {
      setJoinError("Please enter a valid code");
      return;
    }
    onEnter(role, code, trimmedName);
  };

  const handleStartName = () => {
    if (!role) return;
    setStep("name");
    setNameError("");
  };

  const handleJoinFlow = () => {
    setStep("join");
    setJoinError("");
  };

  const roleName = ROLES.find((r) => r.id === role)?.name || "Player";

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "#000000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <BgDecorations />
      <ParticleField count={22} />

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
              color: "#ffffff",
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
            background: "rgba(15,15,15,0.85)",
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
                onClick={handleChooseCreate}
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
                  background: role ? "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)" : "rgba(255,255,255,0.04)",
                  color: role ? "#000" : "rgba(255,255,255,0.2)",
                  border: role ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: role ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  marginBottom: "0.625rem",
                }}
              >
                <i className="fa-solid fa-plus" style={{ fontSize: "0.65rem" }} />
                Create Room
              </button>

              {/* Join Room button */}
              <button
                onClick={handleChooseJoin}
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <i className="fa-solid fa-right-to-bracket" style={{ fontSize: "0.65rem" }} />
                Join Room
              </button>
            </>
          )}

          {/* ── Step: Display Name ── */}
          {step === "name" && (
            <>
              <button
                onClick={() => { setStep("role"); setNameError(""); setNextAction(null); }}
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
                Enter a Display Name
              </p>

              <input
                type="text"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setNameError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleNameContinue(); }}
                placeholder="ie: Shadow Fox"
                maxLength={24}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: nameError ? "1px solid rgba(229,62,62,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.875rem",
                  padding: "0.875rem 1rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#fff",
                  outline: "none",
                  caretColor: "#ffffff",
                  marginBottom: "0.75rem",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => { if (!nameError) e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
                onBlur={(e) => { if (!nameError) e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />

              {nameError && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "#fc8181", marginBottom: "0.75rem" }}>
                  {nameError}
                </p>
              )}

              <button
                onClick={handleNameContinue}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "0.875rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: canProceed ? "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)" : "rgba(255,255,255,0.04)",
                  color: canProceed ? "#000" : "rgba(255,255,255,0.2)",
                  border: canProceed ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: canProceed ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                }}
              >
                Continue
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

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1.25rem" }}>
                Your Room Code
              </p>

              {/* Code display letter boxes */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "1rem",
                  padding: "1rem",
                  marginBottom: "1rem",
                  justifyContent: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: "0", display: "flex", justifyContent: "center", maxWidth: "100%" }}>
                  <RoomCodeDisplay code={createdCode} size="lg" />
                </div>
                <button
                  onClick={handleCopy}
                  title="Copy code"
                  style={{
                    flexShrink: 0,
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.75rem",
                    background: copied ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)",
                    border: copied ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    color: copied ? "#4ade80" : "rgba(255,255,255,0.6)",
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
                onClick={() => onEnter(role, createdCode, trimmedName)}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "0.875rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)",
                  color: "#000",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
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
                  setJoinInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 4));
                  setJoinError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleJoinSubmit(); }}
                placeholder="----"
                maxLength={4}
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
                  caretColor: "#ffffff",
                  textAlign: "center",
                  marginBottom: "0.5rem",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => { if (!joinError) e.target.style.borderColor = "rgba(255,255,255,0.3)"; }}
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
                disabled={joinInput.length !== 4 || validating}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "0.875rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: joinInput.length === 4 && !validating ? "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)" : "rgba(255,255,255,0.04)",
                  color: joinInput.length === 4 && !validating ? "#000" : "rgba(255,255,255,0.2)",
                  border: joinInput.length === 4 && !validating ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: joinInput.length === 4 && !validating ? "pointer" : "not-allowed",
                }}
              >
                {validating ? "Checking..." : "Enter Room →"}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
          Warning: prolonged eye contact may result in elimination.
        </p>
      </div>
    </div>
  );
}

// ── Chat Room ────────────────────────────────────────────────────────────────
function ChatRoom({ role, roomCode, displayName, onExit }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingMembers, setTypingMembers] = useState([]);
  const [reactions, setReactions] = useState({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pusherError, setPusherError] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const isTypingRef = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const pusherChannel = `presence-room-${roomCode}`;

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
        channelAuthorization: {
          endpoint: "/api/pusher/auth",
          transport: "ajax",
          params: {
            displayName,
            role,
          },
        },
      });

      const channel = pusherRef.current.subscribe(pusherChannel);
      channelRef.current = channel;

      channel.bind("pusher:subscription_succeeded", (presenceMembers) => {
        const memberList = [];
        presenceMembers.each((member) => {
          memberList.push({
            id: member.id,
            displayName: member.info.displayName,
            role: member.info.role,
          });
        });
        setMembers(memberList);
        setMessages((prev) => [
          ...prev,
          { type: "system", text: `${displayName} joined the room`, timestamp: Date.now() },
        ]);
      });

      channel.bind("pusher:member_added", (member) => {
        setMembers((prev) => {
          if (prev.some((m) => m.id === member.id)) return prev;
          return [
            ...prev,
            {
              id: member.id,
              displayName: member.info.displayName,
              role: member.info.role,
            },
          ];
        });
        setMessages((prev) => [
          ...prev,
          { type: "system", text: `${member.info.displayName} joined the room`, timestamp: Date.now() },
        ]);
      });

      channel.bind("pusher:member_removed", (member) => {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
        setTypingMembers((prev) => prev.filter((tm) => tm.displayName !== member.info.displayName));
        setMessages((prev) => [
          ...prev,
          { type: "system", text: `${member.info.displayName} left the room`, timestamp: Date.now() },
        ]);
      });

      channel.bind("new-message", (data) => {
        setMessages((prev) => [...prev, { ...data, type: "message" }]);
      });

      channel.bind("typing-update", (data) => {
        if (!data || data.displayName === displayName) return;
        setTypingMembers((prev) => {
          if (!data.isTyping) {
            return prev.filter((member) => member.displayName !== data.displayName);
          }
          if (prev.some((member) => member.displayName === data.displayName)) return prev;
          return [...prev, { displayName: data.displayName, role: data.role }];
        });
      });

      channel.bind("message-reaction", (data) => {
        if (!data?.messageId) return;
        setReactions((prev) => ({
          ...prev,
          [data.messageId]: [...(prev[data.messageId] || []), { emoji: data.emoji, displayName: data.displayName }],
        }));
      });

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
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isTypingRef.current) {
        apiTyping(role, roomCode, displayName, false).catch(() => {});
      }
    };
  }, [role, roomCode, displayName]);

  const flushTyping = () => {
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    setIsTyping(false);
    apiTyping(role, roomCode, displayName, false).catch(() => {});
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleInputChange = (value) => {
    setInput(value);
    const normalized = value.trim();
    if (!normalized) {
      flushTyping();
      return;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setIsTyping(true);
      apiTyping(role, roomCode, displayName, true).catch(() => {});
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setIsTyping(false);
      apiTyping(role, roomCode, displayName, false).catch(() => {});
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    flushTyping();
    await apiMessage(text, role, roomCode, displayName);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExit = () => {
    flushTyping();
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
          background: "#000000",
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
        background: "#000000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <ParticleField count={18} />
      {/* Top glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: "none",
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          background: "rgba(15,15,15,0.9)",
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

          {/* Title (Center) */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                fontFamily: "'Abril Fatface', serif",
                fontWeight: 400,
                fontSize: "1.1rem",
                letterSpacing: "0.03em",
                color: "#ffffff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
              }}
            >
              Mafia Empire
            </div>
          </div>

          {/* Room code badge (Right) */}
          <div
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.625rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            <i className="fa-solid fa-hashtag" style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "0.72rem",
                letterSpacing: "0.12em",
                color: "rgba(255,255,255,0.4)",
                whiteSpace: "nowrap",
              }}
            >
              {roomCode}
            </span>
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
          gap: "0.75rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.85rem",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.72)" }}>
              Playing as <strong style={{ color: "#fff" }}>{displayName}</strong> · <strong style={{ color: currentRoleObj.color }}>{currentRoleObj.name}</strong>
            </span>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.85rem",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <i className="fa-solid fa-users" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
              {members.length} in room
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {members.map((member, idx) => {
            const memberRole = ROLES.find((r) => r.id === member.role) || { color: "#fff", bg: "rgba(255,255,255,0.06)" };
            return (
              <span
                key={`${member.displayName}-${idx}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "999px",
                  background: memberRole.bg,
                  color: memberRole.color,
                  border: `1px solid ${memberRole.border}`,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                }}
              >
                <span style={{ width: "1.25rem", height: "1.25rem", borderRadius: "999px", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.08)", color: memberRole.color, fontWeight: 700 }}>
                  {getInitials(member.displayName)}
                </span>
                {member.displayName}
              </span>
            );
          })}
        </div>


        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", color: "rgba(255,255,255,0.08)" }}>
              <i className="fa-solid fa-comments" />
            </div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "rgba(255,255,255,0.15)", margin: "0 0 0.5rem 0" }}>
                The room awaits...
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.08)", margin: 0, lineHeight: 1.5 }}>
                Break the silence. Send the first message.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.type === "system") {
            return (
              <div key={i} style={{ display: "flex", justifyContent: "center", padding: "0.075rem 0", animation: "message-fade-in 0.4s ease" }}>
                <span
                  className="system-message"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.72rem",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {msg.text}
                </span>
              </div>
            );
          }

          const msgRoleObj = ROLES.find((r) => r.id === msg.role) || {
            name: "Unknown",
            icon: "fa-question",
            color: "#60a5fa",
            border: "rgba(59,130,246,0.45)",
            bg: "rgba(59,130,246,0.12)",
          };

          const initials = getInitials(msg.sender);

          return (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", animation: "message-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "0.625rem",
                  background: msgRoleObj.bg,
                  border: `1px solid ${msgRoleObj.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "0.2rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  color: msgRoleObj.color,
                  position: "relative",
                }}
              >
                {initials}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    width: "0.55rem",
                    height: "0.55rem",
                    borderRadius: "50%",
                    background: msgRoleObj.color,
                    border: "1px solid #000000",
                  }}
                  title={msgRoleObj.name}
                />
              </div>

              {/* Message bubble + reactions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", padding: "0 0.25rem" }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.05em", color: msgRoleObj.color }}>
                    {msg.sender}
                  </span>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.65rem", letterSpacing: "0.02em", color: "rgba(255,255,255,0.3)" }}>
                    - {msgRoleObj.name}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
                  <div
                    className="message-bubble"
                    style={{
                      display: "inline-block",
                      width: "fit-content",
                      maxWidth: "min(68vw, 420px)",
                      background: "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(12px)",
                      borderRadius: "0.875rem",
                      border: `1px solid ${msgRoleObj.border}`,
                      borderLeft: `3px solid ${msgRoleObj.color}`,
                      padding: "0.75rem 1rem",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "inline-flex", alignItems: "baseline", gap: "0.45rem", flexWrap: "wrap" }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", lineHeight: 1.6, color: "rgba(255,255,255,0.9)", margin: 0, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                        {msg.text}
                      </p>
                      <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div
        style={{
          background: "rgba(15,15,15,0.9)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          padding: "0.75rem 1rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Typing indicator - above input */}
        {typingMembers.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "0.4rem", marginBottom: "0.7rem", fontSize: "0.75rem", color: "rgba(200,200,200,0.6)", fontStyle: "italic" }}>
            <span style={{ fontFamily: "'Syne', sans-serif", color: "rgba(255,255,255,0.7)" }}>
              {typingMembers.map((tm) => tm.displayName).join(", ")} is typing
            </span>
            <span style={{ display: "flex", gap: "0.15rem", animation: "pulse 1.5s infinite" }}>
              <span style={{ animation: "pulse 1.5s infinite 0s", display: "inline-block" }}>•</span>
              <span style={{ animation: "pulse 1.5s infinite 0.2s", display: "inline-block" }}>•</span>
              <span style={{ animation: "pulse 1.5s infinite 0.4s", display: "inline-block" }}>•</span>
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            maxLength={500}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "0.875rem",
              padding: "0.85rem 1.1rem",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.9)",
              outline: "none",
              caretColor: "#ffffff",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => { 
              e.target.style.borderColor = "rgba(255,255,255,0.3)";
              e.target.style.background = "rgba(255,255,255,0.06)";
            }}
            onBlur={(e) => { 
              e.target.style.borderColor = "rgba(255,255,255,0.07)";
              e.target.style.background = "rgba(255,255,255,0.04)";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              flexShrink: 0,
              width: "2.85rem",
              height: "2.85rem",
              borderRadius: "0.875rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: input.trim() ? "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)" : "rgba(255,255,255,0.04)",
              border: input.trim() ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
              color: input.trim() ? "#000" : "rgba(255,255,255,0.2)",
              cursor: input.trim() ? "pointer" : "not-allowed",
            }}
          >
            <i className="fa-solid fa-paper-plane" style={{ fontSize: "0.9rem" }} />
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem", paddingX: "0.25rem" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", margin: 0 }}>
            <i className="fa-solid fa-keyboard" style={{ marginRight: "0.3rem", opacity: 0.7 }} />
            Enter to send
          </p>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.65rem", fontWeight: 600, color: input.length > 450 ? "#f59e0b" : input.length > 480 ? "#ef4444" : "rgba(255,255,255,0.25)", transition: "color 0.2s" }}>
            {input.length} / 500
          </span>
        </div>
      </div>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("lobby");
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [displayName, setDisplayName] = useState("");

  const handleEnter = (selectedRole, code, name) => {
    setRole(selectedRole);
    setRoomCode(code);
    setDisplayName(name);
    setScreen("chat");
  };

  const handleExit = () => {
    setRole(null);
    setRoomCode(null);
    setDisplayName("");
    setScreen("lobby");
  };

  if (screen === "lobby") return <Lobby onEnter={handleEnter} />;
  return <ChatRoom role={role} roomCode={roomCode} displayName={displayName} onExit={handleExit} />;
}
