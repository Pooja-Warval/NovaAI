import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface AppEnv {
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;
  DID_API_KEY: string;
  DID_AGENT_ID: string;
  DID_CLIENT_KEY: string;
  DID_PRESENTER_ID: string;
  DID_VOICE_ID: string;
}

export const env: AppEnv = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  DID_API_KEY: process.env.DID_API_KEY ? process.env.DID_API_KEY.trim() : "",
  DID_AGENT_ID: process.env.DID_AGENT_ID ? process.env.DID_AGENT_ID.trim() : "",
  DID_CLIENT_KEY: process.env.DID_CLIENT_KEY ? process.env.DID_CLIENT_KEY.trim() : "",
  DID_PRESENTER_ID: process.env.DID_PRESENTER_ID?.trim() || "v2_public_Amber@0zSz8kflCN",
  DID_VOICE_ID: process.env.DID_VOICE_ID?.trim() || "en-US-JennyMultilingualV2Neural",
};

/**
 * Returns formatted Basic Auth header value for D-ID API.
 * Handles:
 * 1. Raw credentials in "username:password" or "key_id:key_secret" format -> Base64 encodes
 * 2. Already Base64 encoded keys
 * 3. Accidental "Basic " prefix in .env
 */
export function getDidAuthHeader(apiKey: string = env.DID_API_KEY): string {
  if (!apiKey) {
    return "";
  }

  let cleanKey = apiKey.trim();

  // Strip prefix if user included "Basic " in their env var
  if (cleanKey.toLowerCase().startsWith("basic ")) {
    cleanKey = cleanKey.slice(6).trim();
  }

  // If contains a colon, it's raw credentials (username:password) -> encode to base64
  if (cleanKey.includes(":")) {
    return `Basic ${Buffer.from(cleanKey).toString("base64")}`;
  }

  // Otherwise assume it is already a Base64-encoded token
  return `Basic ${cleanKey}`;
}
