import path from "node:path";
import os from "node:os";

export const HUBSPOT_MCP_URL =
  process.env.HUBSPOT_MCP_URL ?? "https://mcp.hubspot.com/";

export function defaultTokenPath(): string {
  return path.join(os.homedir(), ".config", "hubspot-mcp-bridge", "session.json");
}

export function resolveTokenPath(): string {
  return process.env.HUBSPOT_MCP_TOKEN_PATH ?? defaultTokenPath();
}

export function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.HUBSPOT_MCP_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_MCP_CLIENT_SECRET ?? "";
  if (!clientId) {
    throw new Error(
      "Missing HUBSPOT_MCP_CLIENT_ID (and optionally HUBSPOT_MCP_CLIENT_SECRET).",
    );
  }
  return { clientId, clientSecret };
}

export function getRedirectUri(): string {
  const u = process.env.HUBSPOT_MCP_REDIRECT_URI?.trim();
  if (!u) {
    throw new Error(
      "Missing HUBSPOT_MCP_REDIRECT_URI — must match a redirect URL on your HubSpot MCP auth app.",
    );
  }
  return u;
}

/**
 * Redirect URI for OAuth client metadata. When using only env-injected access tokens,
 * a placeholder is used so the provider stays valid; set HUBSPOT_MCP_REDIRECT_URI in production auth flows.
 */
export function getRedirectUriForSession(): string {
  const explicit = process.env.HUBSPOT_MCP_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  if (process.env.HUBSPOT_MCP_ACCESS_TOKEN?.trim()) {
    return "https://localhost/";
  }
  return getRedirectUri();
}

/** Resolve OAuth authorization code: CLI flag > env > stdin (non-TTY). */
export function resolveAuthCode(
  flag: string | undefined,
  envCode: string | undefined,
  stdinLine: string | undefined,
): string | undefined {
  const t = flag?.trim();
  if (t) return t;
  const e = envCode?.trim();
  if (e) return e;
  const s = stdinLine?.trim();
  if (s) return s;
  return undefined;
}
