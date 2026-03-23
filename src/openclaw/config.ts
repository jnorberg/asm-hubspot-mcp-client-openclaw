export interface HubSpotOpenClawPluginConfig {
  /** Prefix for registered tool names (e.g. `hubspot` → `hubspot_get_user_details`). Default: `hubspot`. */
  toolPrefix?: string;
  /** Override session file path (default: env `HUBSPOT_MCP_TOKEN_PATH` or ~/.config/hubspot-mcp-bridge/session.json). */
  sessionPath?: string;
  /** Override HubSpot MCP base URL (default: env `HUBSPOT_MCP_URL` or https://mcp.hubspot.com/). */
  hubspotMcpUrl?: string;
}

export function parseOpenClawPluginConfig(raw: unknown): {
  toolPrefix: string;
  sessionPath?: string;
  hubspotMcpUrl?: string;
} {
  if (!raw || typeof raw !== "object") {
    return { toolPrefix: "hubspot" };
  }
  const o = raw as Record<string, unknown>;
  const toolPrefix =
    typeof o.toolPrefix === "string" ? o.toolPrefix : "hubspot";
  return {
    toolPrefix,
    sessionPath: typeof o.sessionPath === "string" ? o.sessionPath : undefined,
    hubspotMcpUrl: typeof o.hubspotMcpUrl === "string" ? o.hubspotMcpUrl : undefined,
  };
}
