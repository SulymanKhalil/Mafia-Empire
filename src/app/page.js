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
      .message-bubble {
        animation: message-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .system-message {
        animation: message-fade-in 0.4s ease;
      }
      @media (max-width: 768px) {
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

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

// ── API Helpers ──────────────────────────────────────────────────────────────
async function apiRegisterRoom(roomCode, gameMode, creatorName) {
  await fetch("/api/register-room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomCode, gameMode, creatorName }),
  });
}

async function apiValidateRoom(roomCode) {
  try {
    const res = await fetch("/api/validate-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode }),
    });
    if (!res.ok) {
      return { valid: false, error: "Server error. Please try again." };
    }
    return await res.json();
  } catch (err) {
    console.error("apiValidateRoom error:", err);
    return { valid: false, error: "Network error. Please try again." };
  }
}

async function apiMessage(text, role, roomCode, displayName, isMafiaChat = false) {
  await fetch("/api/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, role, roomCode, displayName, isMafiaChat }),
  });
}

async function apiTyping(role, roomCode, displayName, isTyping) {
  await fetch("/api/typing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, roomCode, displayName, isTyping }),
  });
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
  const [step, setStep] = useState("initial"); // initial, create_setup, create_name, create, join_code, join_setup, join_name
  const [gameMode, setGameMode] = useState("simple_game"); // simple_game | advanced_game
  const [role, setRole] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [validating, setValidating] = useState(false);

  const trimmedName = displayName.trim();
  const canProceed = trimmedName.length >= 2;

  const handleCreateClick = (selectedMode) => {
    setGameMode(selectedMode);
    setRole(null);
    setStep("create_setup");
  };

  const handleCreateRoom = async () => {
    if (!canProceed) {
      setNameError("Real name must be at least 2 characters.");
      return;
    }
    const code = generateRoomCode();
    setCreatedCode(code);
    setStep("create");
    await apiRegisterRoom(code, gameMode, trimmedName);
  };

  const handleJoinValidation = async () => {
    const code = joinInput.trim();
    if (code.length !== 4) {
      setJoinError("Code must be 4 digits");
      return;
    }
    setValidating(true);
    const result = await apiValidateRoom(code);
    setValidating(false);
    if (!result.valid) {
      setJoinError(result.error || "Please enter a valid code");
      return;
    }
    setGameMode(result.gameMode || "simple_game");
    setRole(null);
    setStep("join_setup");
  };

  const handleCopy = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Only Mafia and Civilian are allowed in Simple Game
  const activeRoles = gameMode === "simple_game"
    ? ROLES.filter(r => r.id === "mafia" || r.id === "civilian")
    : ROLES;

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

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "22.5rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 8px #e53e3e" }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
              Mafia Empire
            </span>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171", boxShadow: "0 0 8px #e53e3e" }} />
          </div>

          <h1
            style={{
              fontFamily: "'Abril Fatface', serif",
              fontWeight: 400,
              fontSize: "2.5rem",
              lineHeight: 1.1,
              color: "#ffffff",
              marginBottom: "0.5rem",
            }}
          >
            Select Game Mode
          </h1>
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
          {/* ── Step: Initial (Game Selection Home UI) ── */}
          {step === "initial" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 0.25rem 0" }}>
                Select Game Mode
              </p>

              {/* Game Mode Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
                {/* Card 1: Classic Showdown */}
                <div
                  onClick={() => setGameMode("simple_game")}
                  style={{
                    background: gameMode === "simple_game" ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                    border: gameMode === "simple_game" ? "1px solid #fc8181" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "1rem",
                    padding: "1.25rem 0.5rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.65rem",
                    textAlign: "center",
                    boxShadow: gameMode === "simple_game" ? "0 0 10px rgba(252,129,129,0.12)" : "none"
                  }}
                >
                  <i 
                    className="fa-solid fa-street-view" 
                    style={{ 
                      fontSize: "1.75rem", 
                      color: gameMode === "simple_game" ? "#fc8181" : "rgba(255,255,255,0.4)" 
                    }} 
                  />
                  <div>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.92rem", color: gameMode === "simple_game" ? "#fc8181" : "#fff", margin: "0 0 0.25rem 0" }}>
                      Classic Showdown
                    </h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.3 }}>
                      Mafia vs Civilian
                    </p>
                  </div>
                </div>

                {/* Card 2: Mafia: Ultimate */}
                <div
                  onClick={() => setGameMode("advanced_game")}
                  style={{
                    background: gameMode === "advanced_game" ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
                    border: gameMode === "advanced_game" ? "1px solid #fc8181" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "1rem",
                    padding: "1.25rem 0.5rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.65rem",
                    textAlign: "center",
                    boxShadow: gameMode === "advanced_game" ? "0 0 10px rgba(252,129,129,0.12)" : "none"
                  }}
                >
                  <i 
                    className="fa-solid fa-skull-crossbones" 
                    style={{ 
                      fontSize: "1.75rem", 
                      color: gameMode === "advanced_game" ? "#fc8181" : "rgba(255,255,255,0.4)" 
                    }} 
                  />
                  <div>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.92rem", color: gameMode === "advanced_game" ? "#fc8181" : "#fff", margin: "0 0 0.25rem 0" }}>
                      Mafia: Ultimate
                    </h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.3 }}>
                      Full role experience
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons styled like the reference pill designs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {gameMode === "simple_game" ? (
                  <button
                    onClick={() => handleCreateClick("simple_game")}
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      borderRadius: "1.25rem",
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      background: "#ffffff",
                      color: "#000000",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s",
                    }}
                  >
                    <i className="fa-solid fa-plus" />
                    Create Classic Room
                  </button>
                ) : (
                  <button
                    onClick={() => handleCreateClick("advanced_game")}
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      borderRadius: "1.25rem",
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      background: "#ffffff",
                      color: "#000000",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s",
                    }}
                  >
                    <i className="fa-solid fa-plus" />
                    Create Ultimate Room
                  </button>
                )}

                <button
                  onClick={() => setStep("join_code")}
                  style={{
                    width: "100%",
                    padding: "0.95rem",
                    borderRadius: "1.25rem",
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background: "transparent",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.18)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                  }}
                >
                  <i className="fa-solid fa-right-to-bracket" style={{ fontSize: "0.8rem" }} />
                  Join Room
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Create Setup (Select Role) ── */}
          {step === "create_setup" && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep("initial"); setRole(null); }}
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
                }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.6rem" }} />
                Back to Modes Selection
              </button>

              <div style={{ marginBottom: "1rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                Selected Mode: <strong style={{ color: gameMode === "advanced_game" ? "#fc8181" : "#fff" }}>
                  {gameMode === "advanced_game" ? "Advanced Game" : "Simple Game"}
                </strong>
              </div>

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>
                Select Your Initial Role
              </p>

              {/* Role Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                {activeRoles.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      style={{
                        background: isSelected ? r.bg : "rgba(255,255,255,0.03)",
                        border: isSelected ? `1px solid ${r.border}` : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "0.875rem",
                        padding: "1rem 0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <i className={`fa-solid ${r.icon}`} style={{ fontSize: "1.4rem", color: isSelected ? r.color : "rgba(255,255,255,0.4)" }} />
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: isSelected ? r.color : "rgba(255,255,255,0.7)" }}>
                        {r.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep("create_name")}
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
                  transition: "all 0.2s",
                }}
              >
                Continue
              </button>
            </>
          )}

          {/* ── Step: Create Name (Real Name Input Only) ── */}
          {step === "create_name" && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep("create_setup"); setNameError(""); }}
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
                }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.6rem" }} />
                Back
              </button>

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1rem" }}>
                Enter your Real Name
              </p>

              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setNameError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && canProceed) handleCreateRoom(); }}
                placeholder="e.g. Ahmed, Sara, Usman"
                maxLength={20}
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
                  marginBottom: "0.75rem",
                  boxSizing: "border-box",
                }}
              />

              {nameError && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "#fc8181", marginBottom: "0.75rem" }}>
                  {nameError}
                </p>
              )}

              <button
                onClick={handleCreateRoom}
                disabled={!canProceed}
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
                  transition: "all 0.2s",
                }}
              >
                Create Room
              </button>
            </>
          )}

          {/* ── Step: Create (Display Code) ── */}
          {step === "create" && (
            <>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1.25rem" }}>
                Your Room Code
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
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
                Share this code with others so they can join.
              </p>

              <button
                onClick={() => onEnter(role, createdCode, trimmedName, gameMode, trimmedName)}
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

          {/* ── Step: Join Code Input ── */}
          {step === "join_code" && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep("initial"); setJoinError(""); setJoinInput(""); }}
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
                }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.6rem" }} />
                Back to Modes Selection
              </button>

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1rem" }}>
                Enter Room Code
              </p>

              <input
                type="text"
                value={joinInput}
                onChange={(e) => { setJoinInput(e.target.value.replace(/\D/g, "")); setJoinError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && joinInput.length === 4) handleJoinValidation(); }}
                placeholder="4-digit code"
                maxLength={4}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: joinError ? "1px solid rgba(229,62,62,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.875rem",
                  padding: "0.875rem 1.1rem",
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  color: "#fff",
                  textAlign: "center",
                  outline: "none",
                  letterSpacing: "0.15em",
                  marginBottom: "0.75rem",
                  boxSizing: "border-box",
                }}
              />

              {joinError && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "#fc8181", marginBottom: "0.75rem" }}>
                  {joinError}
                </p>
              )}

              <button
                onClick={handleJoinValidation}
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
                  background: joinInput.length === 4 ? "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)" : "rgba(255,255,255,0.04)",
                  color: joinInput.length === 4 ? "#000" : "rgba(255,255,255,0.2)",
                  border: joinInput.length === 4 ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: joinInput.length === 4 ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                {validating ? "Checking..." : "Find Room"}
              </button>
            </>
          )}

          {/* ── Step: Join Setup (Select Role) ── */}
          {step === "join_setup" && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep("join_code"); setRole(null); }}
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
                }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.6rem" }} />
                Back
              </button>

              <div style={{ marginBottom: "1rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                Detected Mode: <strong style={{ color: gameMode === "advanced_game" ? "#fc8181" : "#fff" }}>
                  {gameMode === "advanced_game" ? "Advanced Game" : "Simple Game"}
                </strong>
              </div>

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.75rem" }}>
                Select Your Role
              </p>

              {/* Role Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                {activeRoles.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      style={{
                        background: isSelected ? r.bg : "rgba(255,255,255,0.03)",
                        border: isSelected ? `1px solid ${r.border}` : "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "0.875rem",
                        padding: "1rem 0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <i className={`fa-solid ${r.icon}`} style={{ fontSize: "1.4rem", color: isSelected ? r.color : "rgba(255,255,255,0.4)" }} />
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: isSelected ? r.color : "rgba(255,255,255,0.7)" }}>
                        {r.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep("join_name")}
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
                  transition: "all 0.2s",
                }}
              >
                Continue
              </button>
            </>
          )}

          {/* ── Step: Join Name ── */}
          {step === "join_name" && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep("join_setup"); setNameError(""); }}
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
                }}
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: "0.6rem" }} />
                Back
              </button>

              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "1rem" }}>
                Enter your Real Name
              </p>

              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setNameError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && canProceed) onEnter(role, joinInput, trimmedName, gameMode, ""); }}
                placeholder="e.g. Ahmed, Sara, Usman"
                maxLength={20}
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
                  marginBottom: "0.75rem",
                  boxSizing: "border-box",
                }}
              />

              {nameError && (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "#fc8181", marginBottom: "0.75rem" }}>
                  {nameError}
                </p>
              )}

              <button
                onClick={() => onEnter(role, joinInput, trimmedName, gameMode, "")}
                disabled={!canProceed}
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
                  transition: "all 0.2s",
                }}
              >
                Join Room
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ChatRoom ─────────────────────────────────────────────────────────────────
function ChatRoom({ role, roomCode, displayName, gameMode, initialCreatorName, onExit }) {
  const [messages, setMessages] = useState([]);
  const [mafiaMessages, setMafiaMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [typingMembers, setTypingMembers] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pusherError, setPusherError] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const isTypingRef = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const mafiaChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Layout screen selector for Advanced Game
  // Default is "action" as per request
  const [activeScreen, setActiveScreen] = useState(gameMode === "advanced_game" ? "action" : "chat");
  const [chatTab, setChatTab] = useState("public"); // public | mafia

  // Game Creator Permission
  const [creatorName, setCreatorName] = useState(initialCreatorName || "");
  const isCreator = displayName === creatorName;

  // Classic Mafia Game Action states
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameRoundState, setGameRoundState] = useState("idle"); // idle | action | pending | result
  const [roundActivePlayers, setRoundActivePlayers] = useState([]);
  const [submittedPlayers, setSubmittedPlayers] = useState([]);
  const [myActionSubmitted, setMyActionSubmitted] = useState(false);
  const [detectivePrivateResult, setDetectivePrivateResult] = useState(null); // null | "correct" | "incorrect"
  const [publicResultMessage, setPublicResultMessage] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  
  // History list
  const [history, setHistory] = useState([]);

  // Live Mafia Selections
  const [mafiaSelections, setMafiaSelections] = useState({});

  const pusherChannel = `presence-room-${roomCode}`;

  // Role validation counts
  const mafiaCount = members.filter(m => m.role === 'mafia').length;
  const civilianCount = members.filter(m => m.role === 'civilian').length;
  const detectiveCount = members.filter(m => m.role === 'detective').length;
  const doctorCount = members.filter(m => m.role === 'doctor').length;

  const isConfigValid = mafiaCount >= 2 && mafiaCount <= 3 && civilianCount >= 4 && detectiveCount <= 1 && doctorCount <= 1;

  // Sync state on load
  useEffect(() => {
    const syncState = async () => {
      try {
        const res = await fetch(`/api/room-state?roomCode=${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.creatorName) setCreatorName(data.creatorName);
          setIsGameStarted(data.isGameStarted);
          setHistory(data.history || []);
          setMafiaSelections(data.mafiaSelections || {});

          if (data.activePlayers && data.activePlayers.length > 0) {
            setRoundActivePlayers(data.activePlayers);
            setSubmittedPlayers(data.submittedPlayers || []);
            setPublicResultMessage(data.resolvedResult);
            
            if (data.resolvedResult) {
              setGameRoundState("result");
            } else {
              const alreadySubmitted = data.submittedPlayers && data.submittedPlayers.includes(displayName);
              setMyActionSubmitted(alreadySubmitted);
              setGameRoundState("action");
            }
          }
        }
      } catch (err) {
        console.error("Error syncing room state:", err);
      }
    };
    syncState();
  }, [roomCode, displayName]);

  // Pusher setup
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
            gameMode,
            creatorName,
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

      // Creator Start Event
      channel.bind("game-started", (data) => {
        setIsGameStarted(true);
        setRoundActivePlayers(data.activePlayers);
        setGameRoundState("idle"); // start round transition
      });

      // Round Started broadcast
      channel.bind("round-started", (data) => {
        setRoundActivePlayers(data.activePlayers);
        setSubmittedPlayers([]);
        setMyActionSubmitted(false);
        setDetectivePrivateResult(null);
        setPublicResultMessage(null);
        setSelectedTarget(null);
        setMafiaSelections({});
        setGameRoundState("action");
      });

      // Individual player submitted checkpoint broadcast
      channel.bind("action-submitted", (data) => {
        setSubmittedPlayers((prev) => {
          if (prev.includes(data.displayName)) return prev;
          return [...prev, data.displayName];
        });
      });

      // Round Resolution broadcast
      channel.bind("actions-resolved", (data) => {
        setPublicResultMessage(data.resultMessage);
        setHistory(data.history || []);
        setGameRoundState("result");
      });

      // Subscribe to Mafia Chat & Selections
      let mafiaChannel = null;
      if (gameMode === "advanced_game" && role === "mafia") {
        mafiaChannel = pusherRef.current.subscribe(`${pusherChannel}-mafia`);
        mafiaChannelRef.current = mafiaChannel;

        mafiaChannel.bind("new-mafia-message", (data) => {
          setMafiaMessages((prev) => [...prev, { ...data, type: "message" }]);
        });

        // Sync live Mafia selections
        mafiaChannel.bind("mafia-selection-updated", (data) => {
          setMafiaSelections(data.mafiaSelections || {});
        });
      }

      return () => {
        channel.unbind_all();
        pusherRef.current.unsubscribe(pusherChannel);
        if (mafiaChannel) {
          mafiaChannel.unbind_all();
          pusherRef.current.unsubscribe(`${pusherChannel}-mafia`);
        }
        pusherRef.current.disconnect();
      };
    } catch (err) {
      console.error("Failed to initialize Pusher:", err);
      setPusherError(true);
    }
  }, [displayName, role, gameMode, roomCode, creatorName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mafiaMessages]);

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
    const isMafiaChat = chatTab === "mafia" && gameMode === "advanced_game";
    await apiMessage(text, role, roomCode, displayName, isMafiaChat);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Creator starts game initially
  const handleStartGame = async () => {
    try {
      const res = await fetch("/api/start-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, displayName, members })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          alert(data.error);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Start Action Flow (Individual Start)
  const handleStartActionFlow = async () => {
    try {
      const currentActive = roundActivePlayers.length > 0
        ? roundActivePlayers
        : members.map(m => ({ displayName: m.displayName, role: m.role }));
      
      await fetch("/api/start-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, members: currentActive })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Live Mafia selection broadcast
  const handleMafiaCardClick = async (targetName) => {
    setSelectedTarget(targetName);
    if (role === "mafia" && gameMode === "advanced_game") {
      try {
        await fetch("/api/mafia-select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode, displayName, target: targetName })
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Submit action target
  const handleSubmitAction = async () => {
    if (!selectedTarget || submittingAction) return;
    setSubmittingAction(true);
    try {
      const res = await fetch("/api/submit-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, displayName, role, target: selectedTarget })
      });
      if (res.ok) {
        const data = await res.json();
        setMyActionSubmitted(true);
        if (role === "detective" && data.isMafia !== undefined) {
          setDetectivePrivateResult(data.isMafia ? "correct" : "incorrect");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Reset for next round
  const handleNextRound = async () => {
    try {
      const nextLiving = roundActivePlayers.filter(p => {
        if (publicResultMessage && publicResultMessage.includes("eliminated")) {
          const elimName = publicResultMessage.replace(" was eliminated.", "").trim();
          return p.displayName !== elimName;
        }
        return true;
      });

      await fetch("/api/start-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, members: nextLiving })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExit = () => {
    flushTyping();
    onExit();
  };

  const isCurrentlyAlive = roundActivePlayers.length === 0 || roundActivePlayers.some(p => p.displayName === displayName);

  const currentRoleObj = ROLES.find((r) => r.id === role) || {
    name: "Unknown",
    icon: "fa-question",
    color: "#fff",
    bg: "rgba(255,255,255,0.1)",
    border: "rgba(255,255,255,0.2)"
  };

  const activeMessages = (chatTab === "mafia" && gameMode === "advanced_game") ? mafiaMessages : messages;

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

      {/* ── Advanced Mode Selector Navigation Tabs ── */}
      {gameMode === "advanced_game" && (
        <div style={{ display: "flex", background: "rgba(15,15,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, zIndex: 10, overflowX: "auto" }}>
          <button 
            onClick={() => setActiveScreen("action")}
            style={{
              flex: 1,
              padding: "0.75rem 0.5rem",
              background: "none",
              border: "none",
              borderBottom: activeScreen === "action" ? "2px solid #fc8181" : "none",
              color: activeScreen === "action" ? "#fc8181" : "rgba(255,255,255,0.45)",
              cursor: "pointer",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              whiteSpace: "nowrap",
              outline: "none"
            }}
          >
            <i className="fa-solid fa-crosshairs" style={{ marginRight: "0.25rem" }} />
            Action
          </button>
          <button 
            onClick={() => setActiveScreen("history")}
            style={{
              flex: 1,
              padding: "0.75rem 0.5rem",
              background: "none",
              border: "none",
              borderBottom: activeScreen === "history" ? "2px solid #fff" : "none",
              color: activeScreen === "history" ? "#fff" : "rgba(255,255,255,0.45)",
              cursor: "pointer",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              whiteSpace: "nowrap",
              outline: "none"
            }}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: "0.25rem" }} />
            History
          </button>
          <button 
            onClick={() => { setActiveScreen("chat"); setChatTab("public"); }}
            style={{
              flex: 1,
              padding: "0.75rem 0.5rem",
              background: "none",
              border: "none",
              borderBottom: (activeScreen === "chat" && chatTab === "public") ? "2px solid #38bdf8" : "none",
              color: (activeScreen === "chat" && chatTab === "public") ? "#38bdf8" : "rgba(255,255,255,0.45)",
              cursor: "pointer",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              whiteSpace: "nowrap",
              outline: "none"
            }}
          >
            <i className="fa-solid fa-comments" style={{ marginRight: "0.25rem" }} />
            Public Chat
          </button>
          {role === "mafia" && (
            <button 
              onClick={() => { setActiveScreen("chat"); setChatTab("mafia"); }}
              style={{
                flex: 1,
                padding: "0.75rem 0.5rem",
                background: "none",
                border: "none",
                borderBottom: (activeScreen === "chat" && chatTab === "mafia") ? "2px solid #ef4444" : "none",
                color: (activeScreen === "chat" && chatTab === "mafia") ? "#ef4444" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: "0.75rem",
                whiteSpace: "nowrap",
                outline: "none"
              }}
            >
              <i className="fa-solid fa-skull" style={{ marginRight: "0.25rem" }} />
              Mafia Chat
            </button>
          )}
        </div>
      )}

      {/* ── Main Layout View switcher ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        
        {/* SCREEN 1: CHAT INTERFACE (Simple Game Chat / Custom Tab in Advanced Game) */}
        {activeScreen === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            
            {/* Messages Area */}
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
              {/* Member detail tags */}
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
                    Playing as <strong style={{ color: "#fff" }}>{displayName}</strong>
                    {gameMode === "simple_game" && (
                      <span> · <strong style={{ color: currentRoleObj.color }}>{currentRoleObj.name}</strong></span>
                    )}
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

              {/* Members listing */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {members.map((member, idx) => {
                  const isAdvanced = gameMode === "advanced_game";
                  const memberRole = isAdvanced 
                    ? { color: "#ffffff", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" } 
                    : (ROLES.find((r) => r.id === member.role) || { color: "#fff", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.1)" });
                  
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

              {/* Chat blank placeholder */}
              {activeMessages.length === 0 && (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", textAlign: "center", padding: "2rem" }}>
                  <div style={{ fontSize: "3rem", color: "rgba(255,255,255,0.08)" }}>
                    <i className="fa-solid fa-comments" />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "rgba(255,255,255,0.15)", margin: "0 0 0.5rem 0" }}>
                      {chatTab === "mafia" ? "Mafia Hideout" : "The room awaits..."}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.08)", margin: 0, lineHeight: 1.5 }}>
                      {chatTab === "mafia" ? "Strategize with your team securely here." : "Accuse, Accompany, Defend. Send a message."}
                    </p>
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {activeMessages.map((msg, i) => {
                if (msg.type === "system") {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center", padding: "0.075rem 0" }}>
                      <span className="system-message" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", fontStyle: "italic", color: "rgba(255,255,255,0.45)" }}>
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isAdvanced = gameMode === "advanced_game";
                const msgRoleObj = isAdvanced 
                  ? { name: "Player", color: "#e5e5e5", border: "rgba(255,255,255,0.1)", bg: "rgba(255,255,255,0.03)" }
                  : (ROLES.find((r) => r.id === msg.role) || { name: "Unknown", color: "#60a5fa", border: "rgba(59,130,246,0.12)", bg: "rgba(59,130,246,0.05)" });

                const initials = getInitials(msg.sender);

                return (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", animation: "message-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                    {/* Initials badge */}
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
                      {!isAdvanced && (
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
                      )}
                    </div>

                    {/* Chat Text bubbles */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", padding: "0 0.25rem" }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.05em", color: msgRoleObj.color }}>
                          {msg.sender}
                        </span>
                        {!isAdvanced && (
                          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.65rem", letterSpacing: "0.02em", color: "rgba(255,255,255,0.3)" }}>
                            - {msgRoleObj.name}
                          </span>
                        )}
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

            {/* Input bar */}
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
                  placeholder={chatTab === "mafia" ? "Send secure mafia message..." : "Type a message..."}
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
            </div>
          </div>
        )}

        {/* SCREEN 2: ACTION SCREEN (Default for Advanced Game) */}
        {activeScreen === "action" && gameMode === "advanced_game" && (
          <div
            style={{
              flex: 1,
              background: "rgba(10,10,10,0.85)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: "1.25rem",
              boxSizing: "border-box",
              position: "relative",
              zIndex: 9,
            }}
          >
            {/* Header indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem", marginBottom: "1.25rem" }}>
              <i className="fa-solid fa-crosshairs" style={{ color: "#fc8181" }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff" }}>
                Interactive Role Actions
              </span>
            </div>

            {/* Waiting for creator status initially */}
            {!isGameStarted && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "24rem", margin: "2rem auto", width: "100%" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "1.5rem", textAlign: "center" }}>
                  <i className="fa-solid fa-hourglass" style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.15)", marginBottom: "1rem" }} />
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#fff", margin: "0 0 0.5rem 0" }}>
                    Lobby State
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>
                    Wait for all players to join. Only the Room Creator can start the gameplay flow once the requirements are met.
                  </p>
                </div>

                {/* Requirements check list */}
                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.75rem", padding: "1rem" }}>
                  <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.75rem", color: "#fff", margin: "0 0 0.6rem 0", textTransform: "uppercase" }}>
                    Advanced Game Requirements:
                  </h4>
                  <ul style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", margin: 0, paddingLeft: "1.2rem", lineHeight: 1.6 }}>
                    <li style={{ color: mafiaCount >= 2 && mafiaCount <= 3 ? "#4ade80" : "#fc8181" }}>
                      Mafia: 2 or 3 players (Currently: {mafiaCount})
                    </li>
                    <li style={{ color: civilianCount >= 4 ? "#4ade80" : "#fc8181" }}>
                      Civilian: At least 4 players (Currently: {civilianCount})
                    </li>
                    {detectiveCount > 1 && <li style={{ color: "#fc8181" }}>Detective: Max 1 player (Currently: {detectiveCount})</li>}
                    {doctorCount > 1 && <li style={{ color: "#fc8181" }}>Doctor: Max 1 player (Currently: {doctorCount})</li>}
                  </ul>
                </div>

                {isCreator ? (
                  <button
                    onClick={handleStartGame}
                    disabled={!isConfigValid}
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      borderRadius: "0.75rem",
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      background: isConfigValid ? "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)" : "rgba(255,255,255,0.03)",
                      color: isConfigValid ? "#000" : "rgba(255,255,255,0.25)",
                      border: isConfigValid ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.05)",
                      cursor: isConfigValid ? "pointer" : "not-allowed",
                      transition: "all 0.2s"
                    }}
                  >
                    Start Game
                  </button>
                ) : (
                  <div style={{ textAlign: "center", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>
                    Waiting for the Room Creator to start the game...
                  </div>
                )}
              </div>
            )}

            {/* Discussion / Action State */}
            {isGameStarted && gameRoundState === "idle" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "24rem", margin: "2rem auto", width: "100%" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "1.5rem", textAlign: "center" }}>
                  <i className="fa-solid fa-comments" style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.15)", marginBottom: "1rem" }} />
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#fff", margin: "0 0 0.5rem 0" }}>
                    Real-life Discussion
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>
                    Discuss your arguments and clues in real life. When ready, click the button below to start your private action flow.
                  </p>
                </div>

                <button
                  onClick={handleStartActionFlow}
                  style={{
                    width: "100%",
                    padding: "0.95rem",
                    borderRadius: "0.75rem",
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    background: "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)",
                    color: "#000",
                    border: "1px solid rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Start Role Action
                </button>
              </div>
            )}

            {/* Selections list */}
            {gameRoundState === "action" && !myActionSubmitted && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "26rem", margin: "0 auto", width: "100%" }}>
                
                {!isCurrentlyAlive ? (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "1.5rem", textAlign: "center" }}>
                    <i className="fa-solid fa-ghost" style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.15)", marginBottom: "1rem" }} />
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#fff", margin: "0 0 0.5rem 0" }}>
                      Spectator / Dead
                    </h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>
                      You are not active in this round. Wait for active players to submit actions.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.75rem", padding: "0.85rem" }}>
                      <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: currentRoleObj.color, margin: "0 0 0.35rem 0", textTransform: "uppercase" }}>
                        Role: {currentRoleObj.name}
                      </h4>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.4 }}>
                        {role === "mafia" && "Select the target player you want to eliminate. Your choices are synced live."}
                        {role === "doctor" && "Select a player to save and protect."}
                        {role === "detective" && "Select a player to investigate."}
                        {role === "civilian" && "Cast a suspicion vote (fake action)."}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {roundActivePlayers.map((player) => {
                        const isSelf = player.displayName === displayName;
                        const isSelected = selectedTarget === player.displayName;
                        
                        const isSelectable = !isSelf || role === "doctor" || role === "civilian";

                        // Collect Mafia Selection markers for this player
                        const selectedByNames = [];
                        if (role === "mafia") {
                          for (const selector in mafiaSelections) {
                            if (mafiaSelections[selector] === player.displayName) {
                              selectedByNames.push(selector);
                            }
                          }
                        }

                        return (
                          <button
                            key={player.displayName}
                            disabled={!isSelectable}
                            onClick={() => handleMafiaCardClick(player.displayName)}
                            style={{
                              width: "100%",
                              padding: "0.75rem 1rem",
                              borderRadius: "0.75rem",
                              fontFamily: "'Syne', sans-serif",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              textAlign: "left",
                              cursor: isSelectable ? "pointer" : "not-allowed",
                              transition: "all 0.2s",
                              background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                              border: isSelected ? `1px solid ${currentRoleObj.color}` : "1px solid rgba(255,255,255,0.05)",
                              color: isSelected ? "#fff" : isSelectable ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <span>{player.displayName} {isSelf && "(You)"}</span>
                              {selectedByNames.length > 0 && (
                                <span style={{ fontSize: "0.68rem", color: "#fc8181", marginLeft: "0.5rem", fontStyle: "italic" }}>
                                  (Selected by: {selectedByNames.join(", ")})
                                </span>
                              )}
                            </div>
                            {isSelected && <i className="fa-solid fa-circle-dot" style={{ color: currentRoleObj.color }} />}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleSubmitAction}
                      disabled={!selectedTarget || submittingAction}
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        borderRadius: "0.75rem",
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        background: selectedTarget ? "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)" : "rgba(255,255,255,0.04)",
                        color: selectedTarget ? "#000" : "rgba(255,255,255,0.25)",
                        border: selectedTarget ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                        cursor: selectedTarget ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                        marginTop: "1rem"
                      }}
                    >
                      {submittingAction ? "Submitting..." : "Submit Action"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Checklist pending states */}
            {((gameRoundState === "action" && myActionSubmitted) || gameRoundState === "pending") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "26rem", margin: "0 auto", width: "100%" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "1rem", textAlign: "center" }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "1.75rem", color: "#fc8181", marginBottom: "0.75rem" }} />
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#fff", margin: "0 0 0.5rem 0" }}>
                    Pending Action Submissions
                  </h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.4 }}>
                    Waiting for active players to submit actions. Roles remain strictly hidden.
                  </p>
                </div>

                {/* Submissions checklist */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {roundActivePlayers.map((player) => {
                    const hasSubmitted = submittedPlayers.includes(player.displayName);
                    return (
                      <div
                        key={player.displayName}
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: "0.5rem",
                          padding: "0.6rem 0.85rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                          {player.displayName}
                        </span>
                        {hasSubmitted ? (
                          <span style={{ color: "#4ade80", fontSize: "0.7rem", fontFamily: "'Syne', sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <i className="fa-solid fa-circle-check" /> Submitted
                          </span>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem", fontFamily: "'Syne', sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <i className="fa-solid fa-circle" style={{ fontSize: "0.4rem" }} /> Pending
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results Panel */}
            {gameRoundState === "result" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "26rem", margin: "0 auto", width: "100%" }}>
                
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.75rem", padding: "1.25rem", textAlign: "center" }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: "2rem", color: "#60a5fa", marginBottom: "0.75rem" }} />
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#fff", margin: "0 0 0.5rem 0" }}>
                    Round Resolution
                  </h3>
                  
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#fff", margin: "0.75rem 0", letterSpacing: "0.02em" }}>
                    {publicResultMessage || "No action recorded."}
                  </p>

                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.4 }}>
                    Outcome resolved securely. Private actions resolved neutrally.
                  </p>
                </div>

                {isCurrentlyAlive && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", padding: "1rem" }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.8rem", color: currentRoleObj.color, margin: "0 0 0.5rem 0", textTransform: "uppercase" }}>
                      Private Role Feedback
                    </h4>
                    
                    {role === "detective" && detectivePrivateResult && (
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        {detectivePrivateResult === "correct" ? (
                          <span style={{ color: "#4ade80", fontWeight: 700 }}><i className="fa-solid fa-circle-check" /> Correct — this player is Mafia.</span>
                        ) : (
                          <span style={{ color: "#fc8181", fontWeight: 700 }}><i className="fa-solid fa-circle-xmark" /> Incorrect — You guessed wrong.</span>
                        )}
                      </div>
                    )}

                    {role === "detective" && !detectivePrivateResult && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                        No check performed or registered.
                      </p>
                    )}

                    {role === "doctor" && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>
                        Your save action was recorded and processed.
                      </p>
                    )}

                    {role === "civilian" && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>
                        Your suspicion vote was logged.
                      </p>
                    )}

                    {role === "mafia" && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>
                        Consensus action resolved.
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleNextRound}
                  style={{
                    width: "100%",
                    padding: "0.85rem",
                    borderRadius: "0.75rem",
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    background: "linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%)",
                    color: "#000",
                    border: "1px solid rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    marginTop: "auto"
                  }}
                >
                  Start Next Round
                </button>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 3: HISTORY SCREEN (Advanced Game Only) */}
        {activeScreen === "history" && gameMode === "advanced_game" && (
          <div
            style={{
              flex: 1,
              background: "rgba(10,10,10,0.85)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: "1.25rem",
              boxSizing: "border-box",
              position: "relative",
              zIndex: 9,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem", marginBottom: "1.25rem" }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: "#fc8181" }} />
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff" }}>
                Records and History
              </span>
            </div>

            {history.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", padding: "2rem", textAlign: "center" }}>
                <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.1)" }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                  No round history recorded yet. History compiles after each resolved round.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "28rem", margin: "0 auto", width: "100%" }}>
                {history.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(229,62,62,0.15)", // red/white themed history cards
                      borderRadius: "0.75rem",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.4rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.85rem", color: "#fc8181" }}>
                        Round {item.round}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                      <div>
                        <strong style={{ color: "#fff" }}>Mafia Outcome:</strong> {item.mafiaResult}
                      </div>
                      <div>
                        <strong style={{ color: "#fff" }}>Doctor:</strong> {item.doctorSave}
                      </div>
                      <div>
                        <strong style={{ color: "#fff" }}>Civilian:</strong> {item.civilianSuspicion}
                      </div>
                      <div>
                        <strong style={{ color: "#fff" }}>Detective:</strong> {item.detectiveGuess}
                      </div>
                      
                      {/* Detective Private check history record */}
                      {role === "detective" && item.detectivePrivate && (
                        <div style={{ background: "rgba(192,132,252,0.1)", border: "1px solid rgba(192,132,252,0.3)", borderRadius: "0.4rem", padding: "0.4rem 0.6rem", marginTop: "0.4rem", color: "#c084fc", fontWeight: 700 }}>
                          <i className="fa-solid fa-user-secret" style={{ marginRight: "0.3rem" }} />
                          {"Private Result: checked "}{item.detectivePrivate.target}{" \u2192 "}{item.detectivePrivate.isMafia ? "Correct (Mafia)" : "Incorrect"}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
  const [gameMode, setGameMode] = useState("simple_game");
  const [creatorName, setCreatorName] = useState("");

  const handleEnter = (selectedRole, code, name, selectedMode, creator) => {
    setRole(selectedRole);
    setRoomCode(code);
    setDisplayName(name);
    setGameMode(selectedMode || "simple_game");
    if (creator) {
      setCreatorName(creator);
    }
    setScreen("chat");
  };

  const handleExit = () => {
    setRole(null);
    setRoomCode(null);
    setDisplayName("");
    setCreatorName("");
    setScreen("lobby");
  };

  if (screen === "lobby") return <Lobby onEnter={handleEnter} />;
  return <ChatRoom role={role} roomCode={roomCode} displayName={displayName} gameMode={gameMode} initialCreatorName={creatorName} onExit={handleExit} />;
}
