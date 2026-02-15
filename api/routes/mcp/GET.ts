import { RouteHandler } from "gadget-server";
import mcpServer from "../../mcp";

/**
 * MCP Server Discovery Endpoint
 * 
 * This endpoint allows MCP clients to discover the capabilities and metadata
 * of this Model Context Protocol server. It returns information about available
 * tools, resources, and prompts that the server exposes.
 * 
 * GET /mcp - Returns server capabilities and metadata in JSON format
 */
const route: RouteHandler = async ({ request, reply, logger }) => {
  try {
    // Get the MCP server capabilities
    const capabilities = await mcpServer.getCapabilities();
    
    // Return the capabilities as JSON with proper content-type
    await reply
      .type("application/json")
      .send(capabilities);
      
  } catch (error) {
    logger.error({ error }, "Error getting MCP server capabilities");
    await reply
      .code(500)
      .type("application/json")
      .send({ 
        error: "Failed to retrieve MCP server capabilities",
        message: error instanceof Error ? error.message : "Unknown error"
      });
  }
};

export default route;