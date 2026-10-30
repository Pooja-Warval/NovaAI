# Nova AI — AI Avatar Backend Module (D-ID Agents API)

A modular backend integration using the official **D-ID Agents API** to power a human-like, conversational **AI Marketing Guide & Growth Strategist Avatar** ("Nova").

---

## 🌟 Features

- **Official D-ID Agents API Integration**: Real-time talking digital avatar powered by D-ID Agents API.
- **AI Marketing Guide Persona**: Custom LLM prompt designed to give concise, spoken marketing strategies, product launch steps, target audience profiling, and high-converting captions/hashtags.
- **Multilingual Support**: Supports simple English, Hindi, and Punjabi where supported by Microsoft Neural Multilingual voices (`en-US-JennyMultilingualV2Neural` / `en-IN-NeerjaMultilingualNeural`).
- **Duplicate Prevention**: Intelligently verifies and reuses existing agent IDs instead of wasting D-ID credits on repeated agent creation.
- **Domain-Restricted Client Key**: Dynamically generates client keys strictly scoped to the configured frontend origin (`FRONTEND_URL`), protecting private API credentials.
- **Security-First Architecture**: Zero exposure of private D-ID API keys (`Basic <key>`) to the client browser.
- **Clean Modular Architecture**: Clean separation into `avatar.routes`, `avatar.controller`, `avatar.service`, `avatar.config`, `avatar.types`, and `avatar.middleware`.

---

## 🏗 Project Architecture

```
NovaAI/
├── .gitignore                      # Git ignore rules (protects .env and node_modules)
├── README.md                       # Main documentation & architecture guide
├── FRONTEND_INTEGRATION.md         # Step-by-step guide for frontend engineers (@d-id/client-sdk)
├── package.json                    # Workspace root scripts
└── backend/
    ├── package.json                # Backend dependencies and scripts
    ├── tsconfig.json               # TypeScript configuration
    ├── postman_collection.json     # Ready-to-import Postman collection
    ├── .env.example                # Environment variables template
    ├── .env                        # Local environment secrets (not committed)
    └── src/
        ├── app.ts                  # Express application setup, CORS, JSON parser, logging
        ├── server.ts               # HTTP server listener and graceful shutdown
        ├── config/
        │   └── env.ts              # Typed environment variables and Basic Auth encoder
        ├── routes/
        │   └── index.ts            # Central API route hub (/api/health, /api/avatar)
        └── modules/
            └── avatar/
                ├── avatar.types.ts       # TypeScript interfaces for D-ID & responses
                ├── avatar.config.ts      # Marketing persona instructions, greetings, voice defaults
                ├── avatar.service.ts     # D-ID Agents API integration logic & caching
                ├── avatar.controller.ts  # HTTP request/response handlers
                ├── avatar.routes.ts      # Express route definitions
                ├── avatar.middleware.ts  # Key verification and payload validation
                └── index.ts              # Module barrel export
```

---

## ⚙️ Prerequisites & Setup

### 1. Install Dependencies

From the repository root or inside `backend/`:

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` inside `backend/`:

```bash
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```ini
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Your D-ID API key from https://studio.d-id.com/account-settings
# Accepts "username:password" or base64 encoded string
DID_API_KEY=your_d_id_api_key_here

# Optional: if you already have an Agent ID, specify it here to skip creation
DID_AGENT_ID=

# Optional: default presenter and voice configurations
DID_PRESENTER_ID=v2_public_Amber@0zSz8kflCN
DID_VOICE_ID=en-US-JennyMultilingualV2Neural
```

### 3. Run the Development Server

```bash
npm run dev
```

The server will launch on `http://localhost:5000` with the status banner displayed in the console.

---

## 📡 API Endpoints

### 1. Check Avatar Status
**`GET /api/avatar/status`**
- **Description**: Verifies if the D-ID API key is configured, whether an agent ID exists, and tests live connectivity.
- **Response**:
```json
{
  "success": true,
  "data": {
    "isReady": true,
    "status": "ready",
    "agentId": "agt_abc123",
    "hasApiKey": true,
    "hasAgentId": true,
    "hasClientKey": true,
    "frontendUrl": "http://localhost:5173",
    "voiceId": "en-US-JennyMultilingualV2Neural",
    "presenterId": "v2_public_Amber@0zSz8kflCN"
  }
}
```

### 2. Get Public Frontend Configuration
**`GET /api/avatar/config`**
- **Description**: Returns frontend-safe configuration (Agent ID, recommended presenter, voice, starter questions). **Never returns private API keys.**
- **Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "agt_abc123",
    "frontendUrl": "http://localhost:5173",
    "isConfigured": true,
    "recommendedPresenterId": "v2_public_Amber@0zSz8kflCN",
    "recommendedVoiceId": "en-US-JennyMultilingualV2Neural",
    "starterMessages": [
      "How should I launch my new product?",
      "What social media platforms are best for my brand?",
      "Can you write high-converting Instagram captions and hashtags for my product?",
      "How do I identify my ideal target audience?"
    ]
  }
}
```

### 3. Initialize or Retrieve D-ID Agent
**`POST /api/avatar/initialize`**
- **Description**: Creates the AI Marketing Agent on D-ID or reuses the existing configured agent. Prevents duplicate creations and credit waste.
- **Request Body** (optional):
```json
{
  "forceRecreate": false
}
```
- **Response**:
```json
{
  "success": true,
  "message": "AI Marketing Avatar created successfully on D-ID.",
  "data": {
    "agentId": "agt_abc123",
    "status": "created",
    "isNew": true,
    "previewName": "Nova Marketing Guide",
    "presenter": {
      "presenterId": "v2_public_Amber@0zSz8kflCN",
      "voiceId": "en-US-JennyMultilingualV2Neural"
    }
  }
}
```

### 4. Generate Scoped Client Key
**`POST /api/avatar/client-key`**
- **Description**: Calls D-ID Agents API to generate a temporary client key restricted to the allowed frontend domain.
- **Request Body** (optional override):
```json
{
  "allowedDomains": ["http://localhost:5173"]
}
```
- **Response**:
```json
{
  "success": true,
  "message": "D-ID client key generated successfully.",
  "data": {
    "clientKey": "Y2xpZW50X2tleV9...",
    "allowedDomains": ["http://localhost:5173"]
  }
}
```

### 5. Disconnect Avatar Session
**`POST /api/avatar/disconnect`**
- **Description**: Internal session cleanup and audit logging when a client closes or ends a WebRTC session.
- **Request Body**:
```json
{
  "sessionId": "sess_12345",
  "reason": "User finished marketing session"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Avatar session disconnected and cleaned up successfully.",
  "data": {
    "disconnected": true,
    "sessionId": "sess_12345",
    "timestamp": "2026-10-30T06:50:00.534Z",
    "reason": "User finished marketing session"
  }
}
```

---

## 🧪 Testing Guide

You can test all endpoints using **Postman** or **cURL**:

### Import Postman Collection
1. Open Postman.
2. Click **Import**.
3. Select `backend/postman_collection.json`.
4. Ensure the `baseUrl` variable is set to `http://localhost:5000`.

### Quick cURL Commands

```bash
# 1. Health check
curl http://localhost:5000/api/health

# 2. Check avatar status
curl http://localhost:5000/api/avatar/status

# 3. Get frontend-safe config
curl http://localhost:5000/api/avatar/config

# 4. Initialize agent (requires DID_API_KEY in .env)
curl -X POST http://localhost:5000/api/avatar/initialize \
  -H "Content-Type: application/json" \
  -d '{"forceRecreate": false}'

# 5. Generate client key (requires DID_API_KEY in .env)
curl -X POST http://localhost:5000/api/avatar/client-key \
  -H "Content-Type: application/json" \
  -d '{"allowedDomains": ["http://localhost:5173"]}'

# 6. Disconnect session
curl -X POST http://localhost:5000/api/avatar/disconnect \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_test", "reason": "Test disconnect"}'
```

---

## 🤝 Frontend Team Integration

Refer to the detailed guide in [FRONTEND_INTEGRATION.md](file:///c:/Users/Guru%20nanak%20ji/Desktop/NovaAI/FRONTEND_INTEGRATION.md) for full browser code and the complete React component.
