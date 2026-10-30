import app from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  console.log("=================================================");
  console.log(" 🚀 Nova AI - Marketing Avatar Backend Started");
  console.log(` 🌐 Server URL:     http://localhost:${env.PORT}`);
  console.log(` 🎯 Environment:    ${env.NODE_ENV}`);
  console.log(` 💻 Frontend Origin: ${env.FRONTEND_URL}`);
  console.log(` 🔑 D-ID Key:       ${env.DID_API_KEY ? "CONFIGURED (" + env.DID_API_KEY.substring(0, 6) + "...)" : "MISSING (Set in .env)"}`);
  console.log(` 🤖 Agent ID:       ${env.DID_AGENT_ID || "Not yet initialized (Call POST /api/avatar/initialize)"}`);
  console.log("-------------------------------------------------");
  console.log(" Endpoints:");
  console.log(`  - Health Check:    GET  http://localhost:${env.PORT}/api/health`);
  console.log(`  - Avatar Status:   GET  http://localhost:${env.PORT}/api/avatar/status`);
  console.log(`  - Avatar Config:   GET  http://localhost:${env.PORT}/api/avatar/config`);
  console.log(`  - Initialize:      POST http://localhost:${env.PORT}/api/avatar/initialize`);
  console.log(`  - Client Key:      POST http://localhost:${env.PORT}/api/avatar/client-key`);
  console.log(`  - Disconnect:      POST http://localhost:${env.PORT}/api/avatar/disconnect`);
  console.log("=================================================");
});

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("\n[Server] Gracefully shutting down...");
  server.close(() => {
    console.log("[Server] Closed active connections. Bye!");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n[Server] SIGTERM received. Shutting down...");
  server.close(() => {
    process.exit(0);
  });
});

export default server;
