import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHubSpotProviderFromEnv } from "../create-provider.js";
import {
  createBridgeClient,
  connectUpstream,
  createHubSpotTransport,
} from "../hubspot.js";
import { HUBSPOT_MCP_URL } from "../env.js";
import { parseOpenClawPluginConfig } from "./config.js";

/**
 * OpenClaw plugin host API (minimal typing; matches community plugins).
 * @see https://github.com/androidStern-personal/openclaw-mcp-adapter
 */
export interface OpenClawPluginApi {
  pluginConfig: unknown;
  registerService: (service: {
    id: string;
    start: () => Promise<void>;
    stop: () => Promise<void>;
  }) => void;
  registerTool: (tool: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (
      id: string,
      params: unknown,
    ) => Promise<{
      content: Array<{ type: string; text?: string }>;
      isError?: boolean;
    }>;
  }) => void;
}

/**
 * OpenClaw extension entry: connects to HubSpot MCP and registers each upstream tool as a native OpenClaw tool.
 */
export default function hubspotMcpOpenClawPlugin(api: OpenClawPluginApi): void {
  let client: Client | undefined;
  let transport: StreamableHTTPClientTransport | undefined;

  api.registerService({
    id: "asm-hubspot-mcp-client-openclaw",
    async start() {
      const cfg = parseOpenClawPluginConfig(api.pluginConfig);
      const mcpUrl = cfg.hubspotMcpUrl ?? HUBSPOT_MCP_URL;

      const provider = createHubSpotProviderFromEnv(cfg.sessionPath);
      client = createBridgeClient();
      transport = createHubSpotTransport(provider, mcpUrl);

      await connectUpstream(client, transport);

      const listed = await client.listTools();
      const tools = listed.tools ?? [];
      const p = cfg.toolPrefix;

      for (const tool of tools) {
        const toolName = p ? `${p}_${tool.name}` : tool.name;
        const upstreamName = tool.name;
        const schema =
          (tool.inputSchema as Record<string, unknown> | undefined) ?? {
            type: "object",
            properties: {},
          };

        api.registerTool({
          name: toolName,
          description: tool.description ?? `HubSpot MCP tool \`${upstreamName}\``,
          parameters: schema,
          async execute(_id: string, params: unknown) {
            const c = client;
            if (!c) {
              return {
                content: [{ type: "text", text: "HubSpot MCP client is not connected." }],
                isError: true,
              };
            }
            const result = await c.callTool({
              name: upstreamName,
              arguments:
                params !== null && typeof params === "object"
                  ? (params as Record<string, unknown>)
                  : {},
            });
            const blocks = Array.isArray(result.content) ? result.content : [];
            const text = blocks
              .map((block: { text?: string }) => String(block.text ?? ""))
              .join("\n");
            return {
              content: [{ type: "text", text }],
              isError: result.isError === true,
            };
          },
        });
      }

      console.log(
        `[asm-hubspot-mcp-client-openclaw] OpenClaw plugin started: ${tools.length} tool(s) registered (prefix: "${p}").`,
      );
    },
    async stop() {
      await client?.close();
      await transport?.close();
      client = undefined;
      transport = undefined;
      console.log("[asm-hubspot-mcp-client-openclaw] OpenClaw plugin stopped.");
    },
  });
}
