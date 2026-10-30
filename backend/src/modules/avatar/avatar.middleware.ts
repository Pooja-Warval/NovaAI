import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";

/**
 * Middleware: Verify that DID_API_KEY is configured before calling external D-ID endpoints.
 * Returns a friendly 503 response if missing, guiding the developer on what to configure.
 */
export function requireDidApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!env.DID_API_KEY || env.DID_API_KEY.trim() === "") {
    res.status(503).json({
      success: false,
      error: "D-ID API key is not configured.",
      message: "Please set your DID_API_KEY in the backend/.env file to use this endpoint.",
      helpUrl: "https://studio.d-id.com/account-settings",
    });
    return;
  }
  next();
}

/**
 * Middleware: Validate client key creation body if domain override is passed.
 */
export function validateClientKeyRequest(req: Request, res: Response, next: NextFunction): void {
  const { allowedDomains } = req.body;

  if (allowedDomains !== undefined) {
    if (!Array.isArray(allowedDomains)) {
      res.status(400).json({
        success: false,
        error: 'Invalid "allowedDomains" parameter. It must be an array of URL strings.',
      });
      return;
    }

    for (const domain of allowedDomains) {
      if (typeof domain !== "string" || (!domain.startsWith("http://") && !domain.startsWith("https://"))) {
        res.status(400).json({
          success: false,
          error: `Invalid domain format: "${domain}". Domains must start with http:// or https://.`,
        });
        return;
      }
    }
  }

  next();
}
