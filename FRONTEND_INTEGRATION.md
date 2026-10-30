# Frontend Integration Guide: D-ID Real-Time AI Avatar

This guide provides everything our frontend team needs to connect and stream the **Nova AI Marketing Avatar** in real time using the official **D-ID Client SDK** (`@d-id/client-sdk`).

---

## 1. Architecture Overview

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     Client Browser (React/Vite) │           │      Nova Backend (Node/Express)│
│  @d-id/client-sdk               │           │                                 │
│                                 │           │                                 │
│  1. Fetch agentId & config  ────┼──────────►│ GET  /api/avatar/config         │
│  2. Request clientKey       ────┼──────────►│ POST /api/avatar/client-key     │
│                                 │           │   (Generates key restricted     │
│                                 │           │    to frontend origin)          │
│                                 │           └─────────────────────────────────┘
│                                 │
│  3. createAgentManager()        │           ┌─────────────────────────────────┐
│  4. WebRTC Connection       ────┼──────────►│ D-ID Real-Time Streaming Server │
│  5. Stream live video/audio ◄───┼───────────┤ (WebRTC Video + Voice)          │
│  6. agent.chat("question")  ────┼──────────►│                                 │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

> **IMPORTANT**: The `@d-id/client-sdk` must run **exclusively in the browser (client-side)** because it depends on browser WebRTC APIs (`RTCPeerConnection`, `MediaStream`). Never run the SDK on the Node.js backend.

---

## 2. Frontend Installation

Install the official D-ID Client SDK in your frontend project:

```bash
npm install @d-id/client-sdk
```

---

## 3. Quick-Start Implementation (Vanilla JS / TS)

Here is a complete, minimal implementation:

```typescript
import * as did from "@d-id/client-sdk";

const BACKEND_URL = "http://localhost:5000";

let agentManager: any = null;

export async function startAvatarSession(videoElement: HTMLVideoElement) {
  // 1. Fetch Agent ID and public configuration from our backend
  const configRes = await fetch(`${BACKEND_URL}/api/avatar/config`);
  const { data: config } = await configRes.json();
  const agentId = config.agentId;

  if (!agentId) {
    throw new Error("Avatar Agent is not initialized. Call backend /api/avatar/initialize first.");
  }

  // 2. Obtain a frontend-scoped Client Key from our backend
  const keyRes = await fetch(`${BACKEND_URL}/api/avatar/client-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const { data: keyData } = await keyRes.json();
  const clientKey = keyData.clientKey;

  // 3. Define WebRTC and event callbacks
  const callbacks = {
    // When the avatar video stream is ready, attach it to your HTML <video> element
    onSrcObjectReady(mediaStream: MediaStream) {
      videoElement.srcObject = mediaStream;
      videoElement.play().catch(console.error);
    },
    // Monitor connection states ("connecting", "connected", "disconnected", etc.)
    onConnectionStateChange(state: string) {
      console.log("[D-ID] Connection state:", state);
    },
    // Listen to real-time conversation messages (user & avatar)
    onNewMessage(messages: any[], type: string) {
      console.log("[D-ID] Transcript update:", messages, type);
    },
    // Video state changes ("playing", "stopped")
    onVideoStateChange(state: string) {
      console.log("[D-ID] Video state:", state);
    },
    onError(error: any) {
      console.error("[D-ID] Error:", error);
    },
  };

  // 4. Initialize the Agent Manager using the scoped client key
  agentManager = await did.createAgentManager(agentId, {
    auth: {
      type: "key",
      clientKey: clientKey,
    },
    callbacks,
  });

  // 5. Connect WebRTC stream to D-ID
  await agentManager.connect();
  console.log("Connected to Nova Marketing Avatar!");
  return agentManager;
}

// Send user question to avatar
export async function askAvatar(question: string) {
  if (!agentManager) throw new Error("Agent not connected");
  await agentManager.chat(question);
}

// Disconnect avatar session cleanly
export async function stopAvatarSession() {
  if (agentManager) {
    await agentManager.disconnect();
    agentManager = null;

    // Notify backend for session audit/cleanup
    await fetch(`${BACKEND_URL}/api/avatar/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "User left session" }),
    });
  }
}
```

---

## 4. Production-Ready React Component (`MarketingAvatar.tsx`)

Copy and paste this ready-to-use component into your React/Vite app:

```tsx
import React, { useEffect, useRef, useState } from "react";
import * as did from "@d-id/client-sdk";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const MarketingAvatar: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const agentRef = useRef<any>(null);

  const [connectionState, setConnectionState] = useState<string>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState<string>("");
  const [starterQuestions, setStarterQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Load backend public config (starter questions, agent readiness)
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/avatar/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.starterMessages) {
          setStarterQuestions(data.data.starterMessages);
        }
      })
      .catch((err) => console.error("Config fetch error:", err));
  }, []);

  // Connect to Avatar
  const handleConnect = async () => {
    try {
      setError(null);
      setConnectionState("connecting");

      // 1. Fetch Config
      const configRes = await fetch(`${BACKEND_URL}/api/avatar/config`);
      const configData = await configRes.json();
      if (!configData.data?.agentId) {
        throw new Error("Avatar Agent not ready. Call backend /api/avatar/initialize first.");
      }

      // 2. Fetch scoped client key
      const keyRes = await fetch(`${BACKEND_URL}/api/avatar/client-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const keyData = await keyRes.json();
      if (!keyData.success || !keyData.data?.clientKey) {
        throw new Error(keyData.error || "Failed to generate D-ID client key.");
      }

      // 3. Setup callbacks
      const callbacks = {
        onSrcObjectReady(mediaStream: MediaStream) {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch(console.error);
          }
        },
        onConnectionStateChange(state: string) {
          setConnectionState(state);
        },
        onNewMessage(newMessages: any[]) {
          if (Array.isArray(newMessages)) {
            const formatted = newMessages.map((msg) => ({
              role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
              content: msg.content || msg.text || "",
            }));
            setMessages(formatted);
          }
        },
        onError(err: any) {
          console.error("D-ID Error:", err);
          setError(err?.message || "Connection error occurred");
        },
      };

      // 4. Create Agent Manager
      const agent = await did.createAgentManager(configData.data.agentId, {
        auth: {
          type: "key",
          clientKey: keyData.data.clientKey,
        },
        callbacks,
      });

      agentRef.current = agent;

      // 5. Connect WebRTC
      await agent.connect();
    } catch (err: any) {
      console.error("Avatar connection error:", err);
      setError(err.message || "Failed to connect to AI Avatar");
      setConnectionState("error");
    }
  };

  // Disconnect Avatar
  const handleDisconnect = async () => {
    try {
      if (agentRef.current) {
        await agentRef.current.disconnect();
        agentRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setConnectionState("disconnected");

      await fetch(`${BACKEND_URL}/api/avatar/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User clicked disconnect" }),
      });
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  // Ask question
  const handleSendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || !agentRef.current) return;

    try {
      setInputQuestion("");
      await agentRef.current.chat(question);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "Failed to send message");
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (agentRef.current) {
        agentRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h2>Nova — AI Marketing Avatar</h2>

      {/* Video Container */}
      <div style={{ background: "#111", borderRadius: 12, overflow: "hidden", minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: "100%", maxHeight: 450, objectFit: "cover" }}
        />
      </div>

      {/* Controls */}
      <div style={{ marginTop: 15, display: "flex", gap: 10, alignItems: "center" }}>
        {connectionState !== "connected" ? (
          <button
            onClick={handleConnect}
            disabled={connectionState === "connecting"}
            style={{ padding: "10px 20px", background: "#fd7e14", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
          >
            {connectionState === "connecting" ? "Connecting to Nova..." : "Connect Avatar"}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            style={{ padding: "10px 20px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
          >
            Disconnect
          </button>
        )}
        <span style={{ color: "#666", fontSize: 14 }}>Status: <strong>{connectionState}</strong></span>
      </div>

      {error && <div style={{ color: "red", marginTop: 10 }}>⚠️ {error}</div>}

      {/* Starter Questions */}
      {starterQuestions.length > 0 && connectionState === "connected" && (
        <div style={{ marginTop: 15 }}>
          <p style={{ margin: "5px 0", fontSize: 13, color: "#888" }}>Quick Prompts:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {starterQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                style={{ padding: "6px 12px", background: "#f1f3f5", border: "1px solid #ced4da", borderRadius: 16, cursor: "pointer", fontSize: 13 }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      {connectionState === "connected" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuestion);
          }}
          style={{ marginTop: 15, display: "flex", gap: 8 }}
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask marketing strategy, Instagram captions, target audience..."
            style={{ flex: 1, padding: 10, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: "10px 18px", background: "#228be6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Ask
          </button>
        </form>
      )}

      {/* Conversation Transcript */}
      {messages.length > 0 && (
        <div style={{ marginTop: 20, background: "#f8f9fa", borderRadius: 8, padding: 15, maxHeight: 250, overflowY: "auto" }}>
          <h4>Conversation Transcript</h4>
          {messages.map((m, idx) => (
            <div key={idx} style={{ marginBottom: 8, textAlign: m.role === "user" ? "right" : "left" }}>
              <span style={{ fontWeight: "bold", fontSize: 12, color: m.role === "user" ? "#1971c2" : "#e8590c" }}>
                {m.role === "user" ? "You" : "Nova"}:
              </span>
              <p style={{ margin: "2px 0", fontSize: 14 }}>{m.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 5. Important Browser & SDK Notes

1. **User Gesture Requirement for Video/Audio**: Modern browsers (Chrome, Safari) block auto-playing audio unless the user interacts with the page first (e.g. clicking the "Connect" button).
2. **Video Element Attributes**: Always include `autoplay` and `playsinline` attributes on your `<video>` element.
3. **CORS & Domain Restriction**: The D-ID Client Key issued by our backend is restricted to your frontend origin (default: `http://localhost:5173`). If your frontend runs on a different port or custom domain (e.g., `http://localhost:3000`), update `FRONTEND_URL` in `backend/.env`.
