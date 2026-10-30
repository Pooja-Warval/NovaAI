import { Router } from "express";
import { avatarRouter } from "../modules/avatar";

const apiRouter = Router();

// Health check endpoint
apiRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Nova AI Backend",
  });
});

// Modular Avatar Routes mounted at /api/avatar
apiRouter.use("/avatar", avatarRouter);

export default apiRouter;
