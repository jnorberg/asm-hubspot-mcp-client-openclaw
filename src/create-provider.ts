import { HubSpotOAuthProvider } from "./oauth/hubspot-provider.js";
import {
  getClientCredentials,
  getRedirectUriForSession,
  resolveTokenPath,
} from "./env.js";

/** Shared HubSpot OAuth provider used by CLI and OpenClaw plugin. */
export function createHubSpotProviderFromEnv(sessionPathOverride?: string): HubSpotOAuthProvider {
  const sessionPath = sessionPathOverride ?? resolveTokenPath();
  const { clientId, clientSecret } = getClientCredentials();
  const redirectUri = getRedirectUriForSession();
  return new HubSpotOAuthProvider({
    clientId,
    clientSecret,
    redirectUri,
    sessionPath,
    envAccessToken: process.env.HUBSPOT_MCP_ACCESS_TOKEN,
    envRefreshToken: process.env.HUBSPOT_MCP_REFRESH_TOKEN,
  });
}
