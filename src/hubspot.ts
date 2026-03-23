import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { HubSpotOAuthProvider } from "./oauth/hubspot-provider.js";
import { HUBSPOT_MCP_URL } from "./env.js";

export function createHubSpotTransport(
  provider: HubSpotOAuthProvider,
  mcpBaseUrl: string = HUBSPOT_MCP_URL,
): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(mcpBaseUrl), {
    authProvider: provider,
  });
}

export function createBridgeClient(): Client {
  return new Client(
    { name: "hubspot-mcp-bridge", version: "1.0.0" },
    { capabilities: {} },
  );
}

export async function connectUpstream(
  client: Client,
  transport: StreamableHTTPClientTransport,
): Promise<void> {
  await client.connect(transport);
}
