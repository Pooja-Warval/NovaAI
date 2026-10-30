/**
 * D-ID Presenter Configuration
 */
export interface DIDPresenterVoice {
  type: "microsoft" | "elevenlabs";
  voice_id: string;
}

export interface DIDPresenterConfig {
  type: "clip" | "talk";
  presenter_id: string;
  voice?: DIDPresenterVoice;
  idle_video?: string;
  thumbnail?: string;
}

/**
 * D-ID LLM Configuration
 */
export interface DIDLLMConfig {
  provider: "openai";
  model: string;
  instructions: string;
  template?: string;
}

/**
 * Payload sent to POST https://api.d-id.com/agents
 */
export interface DIDCreateAgentPayload {
  preview_name: string;
  presenter: DIDPresenterConfig;
  llm: DIDLLMConfig;
  greetings?: string[];
  starter_messages?: string[];
}

/**
 * Response received from D-ID Agents API
 */
export interface DIDAgentResponse {
  id: string;
  preview_name?: string;
  status: "created" | "done" | "error" | string;
  created?: string;
  presenter?: DIDPresenterConfig;
  llm?: DIDLLMConfig;
  greetings?: string[];
  starter_messages?: string[];
  access?: string;
}

/**
 * Payload sent to POST https://api.d-id.com/agents/client-key
 */
export interface DIDCreateClientKeyPayload {
  allowed_domains: string[];
}

/**
 * Response from POST https://api.d-id.com/agents/client-key
 */
export interface DIDClientKeyResponse {
  client_key: string;
}

/**
 * Application API Request / Response Types
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface InitializeAgentRequest {
  forceRecreate?: boolean;
  previewName?: string;
  voiceId?: string;
  presenterId?: string;
  instructions?: string;
}

export interface InitializeAgentResponse {
  agentId: string;
  status: string;
  isNew: boolean;
  previewName: string;
  presenter: {
    presenterId: string;
    voiceId?: string;
    idleVideo?: string;
  };
  greetings?: string[];
  starterMessages?: string[];
}

export interface AvatarPublicConfigResponse {
  agentId: string | null;
  frontendUrl: string;
  isConfigured: boolean;
  recommendedPresenterId: string;
  recommendedVoiceId: string;
  starterMessages: string[];
}

export interface ClientKeyRequest {
  allowedDomains?: string[];
}

export interface ClientKeyResponse {
  clientKey: string;
  allowedDomains: string[];
}

export interface AvatarStatusResponse {
  isReady: boolean;
  status: "ready" | "needs_initialization" | "missing_api_key" | "error";
  agentId: string | null;
  hasApiKey: boolean;
  hasAgentId: boolean;
  hasClientKey: boolean;
  frontendUrl: string;
  voiceId: string;
  presenterId: string;
  agentDetails?: {
    previewName?: string;
    status?: string;
    created?: string;
  } | null;
}

export interface DisconnectRequest {
  sessionId?: string;
  agentId?: string;
  reason?: string;
}

export interface DisconnectResponse {
  disconnected: boolean;
  sessionId?: string;
  timestamp: string;
}
