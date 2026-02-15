import type { Server } from "gadget-server";

/**
 * Route scope plugin for MCP (Model Context Protocol) endpoints
 * 
 * This configures CORS (Cross-Origin Resource Sharing) for all routes under /mcp
 * to allow ChatGPT to make requests to the MCP endpoint from its sandbox environment.
 * 
 * The CORS configuration:
 * - Allows all origins (required for ChatGPT's various deployment environments)
 * - Permits GET, POST, and OPTIONS methods (standard for MCP protocol)
 * - Allows Content-Type and Authorization headers (needed for MCP requests)
 * - Enables credentials (allows cookies/auth headers to be sent)
 */
export default async (server: Server) => {
  server.setScopeCORS({
    origin: true, // Allow all origins for ChatGPT sandbox
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });
};