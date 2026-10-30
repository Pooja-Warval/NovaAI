import axios, { AxiosError, AxiosInstance } from "axios";
import { env, getDidAuthHeader } from "../../config/env";
import {
  DID_API_BASE_URL,
  getDefaultAgentPayload,
  AVATAR_STARTER_MESSAGES,
} from "./avatar.config";
import {
  DIDAgentResponse,
  DIDClientKeyResponse,
  DIDCreateAgentPayload,
  InitializeAgentRequest,
  InitializeAgentResponse,
  AvatarStatusResponse,
  AvatarPublicConfigResponse,
} from "./avatar.types";

export class AvatarService {
  private axiosInstance: AxiosInstance;
  private cachedAgentId: string | null = null;
  private cachedClientKey: string | null = null;
  private cachedAgentData: DIDAgentResponse | null = null;

  constructor() {
    this.cachedAgentId = env.DID_AGENT_ID || null;
    this.cachedClientKey = env.DID_CLIENT_KEY || null;

    this.axiosInstance = axios.create({
      baseURL: DID_API_BASE_URL,
      timeout: 25000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Helper to get request headers with Basic Auth
   */
  private getHeaders(): Record<string, string> {
    const authHeader = getDidAuthHeader();
    if (!authHeader) {
      throw new Error("D-ID API key is not configured. Please set DID_API_KEY in your .env file.");
    }
    return {
      Authorization: authHeader,
      "Content-Type": "application/json",
    };
  }

  /**
   * Initialize or retrieve an existing D-ID Agent.
   * Avoids creating duplicate agents if one already exists and is valid.
   */
  public async initializeAgent(
    options: InitializeAgentRequest = {}
  ): Promise<InitializeAgentResponse> {
    const existingId = options.forceRecreate ? null : this.cachedAgentId || env.DID_AGENT_ID;

    // Check if we can reuse an existing agent
    if (existingId) {
      try {
        const agent = await this.getAgent(existingId);
        this.cachedAgentId = agent.id;
        this.cachedAgentData = agent;

        return {
          agentId: agent.id,
          status: agent.status || "ready",
          isNew: false,
          previewName: agent.preview_name || "Nova Marketing Guide",
          presenter: {
            presenterId: agent.presenter?.presenter_id || env.DID_PRESENTER_ID,
            voiceId: agent.presenter?.voice?.voice_id || env.DID_VOICE_ID,
            idleVideo: agent.presenter?.idle_video,
          },
          greetings: agent.greetings,
          starterMessages: agent.starter_messages || AVATAR_STARTER_MESSAGES,
        };
      } catch (err: any) {
        // If agent was not found (404), log and proceed to create a new one
        console.warn(`[AvatarService] Configured agentId "${existingId}" could not be verified on D-ID (${err.message}). Creating a new agent...`);
      }
    }

    // Build payload for new agent creation
    const payload: DIDCreateAgentPayload = getDefaultAgentPayload({
      preview_name: options.previewName,
      presenter: {
        type: "clip",
        presenter_id: options.presenterId || env.DID_PRESENTER_ID,
        voice: {
          type: "microsoft",
          voice_id: options.voiceId || env.DID_VOICE_ID,
        },
      },
      llm: options.instructions
        ? {
            provider: "openai",
            model: "gpt-4.1-mini",
            instructions: options.instructions,
          }
        : undefined,
    });

    try {
      const response = await this.axiosInstance.post<DIDAgentResponse>(
        "/agents",
        payload,
        { headers: this.getHeaders() }
      );

      const createdAgent = response.data;
      this.cachedAgentId = createdAgent.id;
      this.cachedAgentData = createdAgent;

      console.log(`[AvatarService] Successfully created D-ID Agent: ${createdAgent.id}`);

      return {
        agentId: createdAgent.id,
        status: createdAgent.status || "created",
        isNew: true,
        previewName: createdAgent.preview_name || payload.preview_name,
        presenter: {
          presenterId: createdAgent.presenter?.presenter_id || payload.presenter.presenter_id,
          voiceId: createdAgent.presenter?.voice?.voice_id || payload.presenter.voice?.voice_id,
          idleVideo: createdAgent.presenter?.idle_video,
        },
        greetings: createdAgent.greetings || payload.greetings,
        starterMessages: createdAgent.starter_messages || payload.starter_messages,
      };
    } catch (error: any) {
      throw this.handleApiError(error, "Failed to create D-ID Agent");
    }
  }

  /**
   * Retrieve details of a specific D-ID Agent by ID
   */
  public async getAgent(agentId: string): Promise<DIDAgentResponse> {
    if (!agentId) {
      throw new Error("Agent ID is required to fetch agent details.");
    }

    try {
      const response = await this.axiosInstance.get<DIDAgentResponse>(
        `/agents/${agentId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error, `Failed to retrieve D-ID Agent "${agentId}"`);
    }
  }

  /**
   * Generate a scoped D-ID client key restricted to allowed frontend origin(s)
   */
  public async generateClientKey(
    customDomains?: string[]
  ): Promise<{ clientKey: string; allowedDomains: string[] }> {
    // Determine allowed domains: prefer explicitly configured frontend domain
    const domains = customDomains && customDomains.length > 0
      ? customDomains
      : [env.FRONTEND_URL];

    // Sanitize and ensure valid URL origins (e.g., http://localhost:5173)
    const sanitizedDomains = domains
      .map((d) => d.trim().replace(/\/$/, ""))
      .filter((d) => d.length > 0);

    try {
      const response = await this.axiosInstance.post<DIDClientKeyResponse>(
        "/agents/client-key",
        { allowed_domains: sanitizedDomains },
        { headers: this.getHeaders() }
      );

      const clientKey = response.data.client_key;
      this.cachedClientKey = clientKey;

      return {
        clientKey,
        allowedDomains: sanitizedDomains,
      };
    } catch (error: any) {
      throw this.handleApiError(error, "Failed to generate D-ID client key");
    }
  }

  /**
   * Safe frontend configuration details.
   * NEVER returns private API keys.
   */
  public getPublicConfig(): AvatarPublicConfigResponse {
    const currentAgentId = this.cachedAgentId || env.DID_AGENT_ID || null;

    return {
      agentId: currentAgentId,
      frontendUrl: env.FRONTEND_URL,
      isConfigured: Boolean(env.DID_API_KEY && currentAgentId),
      recommendedPresenterId: env.DID_PRESENTER_ID,
      recommendedVoiceId: env.DID_VOICE_ID,
      starterMessages: AVATAR_STARTER_MESSAGES,
    };
  }

  /**
   * Diagnostic status check for the Avatar service
   */
  public async getStatus(): Promise<AvatarStatusResponse> {
    const hasApiKey = Boolean(env.DID_API_KEY);
    const currentAgentId = this.cachedAgentId || env.DID_AGENT_ID || null;
    const hasClientKey = Boolean(this.cachedClientKey || env.DID_CLIENT_KEY);

    if (!hasApiKey) {
      return {
        isReady: false,
        status: "missing_api_key",
        agentId: currentAgentId,
        hasApiKey: false,
        hasAgentId: Boolean(currentAgentId),
        hasClientKey,
        frontendUrl: env.FRONTEND_URL,
        voiceId: env.DID_VOICE_ID,
        presenterId: env.DID_PRESENTER_ID,
        agentDetails: null,
      };
    }

    if (!currentAgentId) {
      return {
        isReady: false,
        status: "needs_initialization",
        agentId: null,
        hasApiKey: true,
        hasAgentId: false,
        hasClientKey,
        frontendUrl: env.FRONTEND_URL,
        voiceId: env.DID_VOICE_ID,
        presenterId: env.DID_PRESENTER_ID,
        agentDetails: null,
      };
    }

    // Agent ID and API Key exist: verify connectivity with D-ID
    try {
      const agent = await this.getAgent(currentAgentId);
      return {
        isReady: true,
        status: "ready",
        agentId: agent.id,
        hasApiKey: true,
        hasAgentId: true,
        hasClientKey,
        frontendUrl: env.FRONTEND_URL,
        voiceId: agent.presenter?.voice?.voice_id || env.DID_VOICE_ID,
        presenterId: agent.presenter?.presenter_id || env.DID_PRESENTER_ID,
        agentDetails: {
          previewName: agent.preview_name,
          status: agent.status,
          created: agent.created,
        },
      };
    } catch (err: any) {
      return {
        isReady: false,
        status: "error",
        agentId: currentAgentId,
        hasApiKey: true,
        hasAgentId: true,
        hasClientKey,
        frontendUrl: env.FRONTEND_URL,
        voiceId: env.DID_VOICE_ID,
        presenterId: env.DID_PRESENTER_ID,
        agentDetails: {
          status: `Verification failed: ${err.message}`,
        },
      };
    }
  }

  /**
   * Cleanup session records or telemetry when client disconnects
   */
  public async disconnectSession(
    sessionId?: string,
    agentId?: string
  ): Promise<{ disconnected: boolean; sessionId?: string; timestamp: string }> {
    // In D-ID SDK architecture, WebRTC stream is closed client-side via agent.disconnect().
    // Backend logs and performs internal session/audit cleanup.
    console.log(`[AvatarService] Disconnected session: ${sessionId || "anonymous"} for agent: ${agentId || this.cachedAgentId || "default"}`);
    
    return {
      disconnected: true,
      sessionId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Standardized error handling and sanitization
   */
  private handleApiError(error: any, contextMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const statusCode = axiosError.response?.status;
      const responseData = axiosError.response?.data;

      let sanitizedMessage = `${contextMessage}`;

      if (statusCode === 401) {
        sanitizedMessage += ": Invalid or unauthorized D-ID credentials. Check DID_API_KEY.";
      } else if (statusCode === 402) {
        sanitizedMessage += ": Insufficient D-ID credits or subscription expired.";
      } else if (statusCode === 403) {
        sanitizedMessage += ": Forbidden request. Domain or operation not permitted.";
      } else if (statusCode === 404) {
        sanitizedMessage += ": Requested D-ID resource or Agent ID not found.";
      } else if (statusCode === 429) {
        sanitizedMessage += ": D-ID API rate limit exceeded. Please retry later.";
      } else if (statusCode && statusCode >= 500) {
        sanitizedMessage += ": D-ID service is temporarily unavailable (HTTP 5xx).";
      } else if (responseData?.message || responseData?.description) {
        sanitizedMessage += `: ${responseData.message || responseData.description}`;
      } else if (axiosError.code === "ECONNABORTED" || axiosError.code === "ENOTFOUND") {
        sanitizedMessage += ": Network timeout or connection failure to D-ID servers.";
      } else {
        sanitizedMessage += `: ${axiosError.message}`;
      }

      const customErr: any = new Error(sanitizedMessage);
      customErr.statusCode = statusCode || 500;
      customErr.details = responseData;
      return customErr;
    }

    return new Error(`${contextMessage}: ${error.message || "Unknown error"}`);
  }
}

// Export singleton instance
export const avatarService = new AvatarService();
