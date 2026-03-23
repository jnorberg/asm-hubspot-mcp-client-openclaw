import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

function logErr(message: string): void {
  process.stderr.write(`${message}\n`);
}

/** Build server capabilities from upstream MCP server capabilities. */
export function bridgeCapabilities(
  caps: ReturnType<Client["getServerCapabilities"]>,
): ServerCapabilities {
  const out: ServerCapabilities = {};
  if (caps?.tools) out.tools = {};
  if (caps?.resources) out.resources = {};
  if (caps?.prompts) out.prompts = {};
  return out;
}

/**
 * Register request handlers that forward to the upstream HubSpot MCP client.
 */
export function registerForwardingHandlers(server: Server, upstream: Client): void {
  const caps = upstream.getServerCapabilities();

  if (caps?.tools) {
    server.setRequestHandler(ListToolsRequestSchema, async (req) => upstream.listTools(req.params));
    server.setRequestHandler(CallToolRequestSchema, async (req) => upstream.callTool(req.params));
  }

  if (caps?.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, async (req) =>
      upstream.listResources(req.params),
    );
    server.setRequestHandler(ReadResourceRequestSchema, async (req) =>
      upstream.readResource(req.params),
    );
  }

  if (caps?.prompts) {
    server.setRequestHandler(ListPromptsRequestSchema, async (req) =>
      upstream.listPrompts(req.params),
    );
    server.setRequestHandler(GetPromptRequestSchema, async (req) => upstream.getPrompt(req.params));
  }
}

/**
 * stdio MCP server that forwards to the HubSpot MCP upstream client.
 */
export async function runStdioBridge(upstream: Client): Promise<void> {
  const caps = upstream.getServerCapabilities();

  const server = new Server(
    { name: "hubspot-mcp-bridge", version: "1.0.0" },
    { capabilities: bridgeCapabilities(caps) },
  );

  registerForwardingHandlers(server, upstream);

  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
  } catch (e) {
    logErr(
      `[hubspot-mcp-bridge] Failed to connect stdio server: ${e instanceof Error ? e.message : String(e)}`,
    );
    throw e;
  }
}
