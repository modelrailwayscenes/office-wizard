import { RouteHandler } from "gadget-server";
import mcpServer from "../../mcp";

/**
 * MCP (Model Context Protocol) endpoint for ChatGPT integration.
 * 
 * This route handles incoming MCP requests from ChatGPT and forwards them
 * to the MCP server for processing. The MCP protocol enables ChatGPT to
 * interact with this Gadget app's data and functionality through a standardized
 * protocol.
 */
const route: RouteHandler = async ({ request, reply, logger }) => {
  try {
    logger.info({ body: request.body }, "Received MCP request from ChatGPT");

    // Pass the MCP request to the server for handling
    const response = await mcpServer.handleRequest(request.body);

    // Return the MCP response as JSON
    await reply.send(response);
  } catch (error) {
    logger.error({ error, body: request.body }, "Error handling MCP request");
    
    // Return an error response in MCP format
    await reply.code(500).send({
      error: {
        code: "internal_error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
    });
  }
};

// Configure route options for MCP protocol
route.options = {
  // Log all MCP requests for debugging and monitoring
  logLevel: "info",
};

export default route;