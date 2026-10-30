import { Request, Response } from "express";
import { avatarService } from "./avatar.service";
import {
  InitializeAgentRequest,
  ClientKeyRequest,
  DisconnectRequest,
} from "./avatar.types";

export class AvatarController {
  /**
   * POST /api/avatar/initialize
   * Initialize or create the D-ID agent.
   * Avoids creating duplicate agents on every request.
   */
  public async initialize(req: Request, res: Response): Promise<void> {
    try {
      const options: InitializeAgentRequest = req.body || {};
      const agentData = await avatarService.initializeAgent(options);

      res.status(agentData.isNew ? 201 : 200).json({
        success: true,
        message: agentData.isNew
          ? "AI Marketing Avatar created successfully on D-ID."
          : "Existing AI Marketing Avatar reused.",
        data: agentData,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      console.error(`[AvatarController] initialize error:`, error.message);
      res.status(statusCode).json({
        success: false,
        error: error.message || "Failed to initialize avatar agent.",
        ...(process.env.NODE_ENV === "development" && error.details ? { details: error.details } : {}),
      });
    }
  }

  /**
   * GET /api/avatar/config
   * Return only the agent ID and frontend-safe configuration.
   * Never returns the private D-ID API key.
   */
  public async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = avatarService.getPublicConfig();
      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error: any) {
      console.error(`[AvatarController] getConfig error:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve avatar configuration.",
      });
    }
  }

  /**
   * POST /api/avatar/client-key
   * Generate a client key using the D-ID API.
   * Restrict allowed domains to the configured frontend URL.
   * Never exposes private D-ID API credentials.
   */
  public async createClientKey(req: Request, res: Response): Promise<void> {
    try {
      const body: ClientKeyRequest = req.body || {};
      const result = await avatarService.generateClientKey(body.allowedDomains);

      res.status(200).json({
        success: true,
        message: "D-ID client key generated successfully.",
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      console.error(`[AvatarController] createClientKey error:`, error.message);
      res.status(statusCode).json({
        success: false,
        error: error.message || "Failed to generate D-ID client key.",
        ...(process.env.NODE_ENV === "development" && error.details ? { details: error.details } : {}),
      });
    }
  }

  /**
   * GET /api/avatar/status
   * Check whether the avatar configuration is ready.
   * Return a useful status response.
   */
  public async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const statusData = await avatarService.getStatus();
      res.status(200).json({
        success: true,
        data: statusData,
      });
    } catch (error: any) {
      console.error(`[AvatarController] getStatus error:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to check avatar status.",
      });
    }
  }

  /**
   * POST /api/avatar/disconnect
   * Implement session cleanup needed by our architecture.
   */
  public async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, agentId, reason }: DisconnectRequest = req.body || {};
      const result = await avatarService.disconnectSession(sessionId, agentId);

      res.status(200).json({
        success: true,
        message: "Avatar session disconnected and cleaned up successfully.",
        data: {
          ...result,
          reason: reason || "User initiated disconnect",
        },
      });
    } catch (error: any) {
      console.error(`[AvatarController] disconnect error:`, error.message);
      res.status(500).json({
        success: false,
        error: "Failed to process disconnect cleanup.",
      });
    }
  }
}

export const avatarController = new AvatarController();
