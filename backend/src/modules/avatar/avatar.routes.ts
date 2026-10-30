import { Router } from "express";
import { avatarController } from "./avatar.controller";
import { requireDidApiKey, validateClientKeyRequest } from "./avatar.middleware";

const router = Router();

/**
 * @route   POST /api/avatar/initialize
 * @desc    Initialize or create the D-ID agent (prevents duplicates)
 * @access  Public / Protected by backend
 */
router.post(
  "/initialize",
  requireDidApiKey,
  (req, res) => avatarController.initialize(req, res)
);

/**
 * @route   GET /api/avatar/config
 * @desc    Get frontend-safe configuration (Agent ID, recommended voices, starter messages)
 * @access  Public
 */
router.get(
  "/config",
  (req, res) => avatarController.getConfig(req, res)
);

/**
 * @route   POST /api/avatar/client-key
 * @desc    Generate restricted D-ID client key for frontend WebRTC SDK connection
 * @access  Public / Protected by backend
 */
router.post(
  "/client-key",
  requireDidApiKey,
  validateClientKeyRequest,
  (req, res) => avatarController.createClientKey(req, res)
);

/**
 * @route   GET /api/avatar/status
 * @desc    Check whether avatar configuration and D-ID agent are ready
 * @access  Public
 */
router.get(
  "/status",
  (req, res) => avatarController.getStatus(req, res)
);

/**
 * @route   POST /api/avatar/disconnect
 * @desc    Handle session cleanup when client disconnects
 * @access  Public
 */
router.post(
  "/disconnect",
  (req, res) => avatarController.disconnect(req, res)
);

export default router;
