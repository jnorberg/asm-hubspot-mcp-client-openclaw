import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import type { HubSpotOAuthProvider } from "./oauth/hubspot-provider.js";
import { HUBSPOT_MCP_URL } from "./env.js";

export type AuthFlowResult = "AUTHORIZED" | "REDIRECT";

export async function runAuthFlow(options: {
  provider: HubSpotOAuthProvider;
  authorizationCode?: string;
  serverUrl?: string;
}): Promise<AuthFlowResult> {
  const serverUrl = options.serverUrl ?? HUBSPOT_MCP_URL;
  return auth(options.provider, {
    serverUrl: new URL(serverUrl),
    authorizationCode: options.authorizationCode,
    fetchFn: fetch,
  });
}
