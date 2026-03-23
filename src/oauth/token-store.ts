import fs from "node:fs/promises";
import path from "node:path";
import type { OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

export interface PersistedSession {
  tokens?: OAuthTokens;
  codeVerifier?: string;
  discoveryState?: OAuthDiscoveryState;
}

/** Reject directories so readFile does not throw EISDIR (common when HUBSPOT_MCP_TOKEN_PATH points at ~/.config/.../hubspot-mcp-bridge/). */
async function assertSessionPathIsAFile(filePath: string): Promise<void> {
  let st;
  try {
    st = await fs.stat(filePath);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return;
    throw e;
  }
  if (st.isDirectory()) {
    throw new Error(
      `Session path is a directory, not a JSON file: ${filePath}\n` +
        `Set HUBSPOT_MCP_TOKEN_PATH to a file (e.g. ${path.join(filePath, "session.json")}) or unset it to use the default ~/.config/hubspot-mcp-bridge/session.json`,
    );
  }
}

export async function readSessionFile(filePath: string): Promise<PersistedSession> {
  await assertSessionPathIsAFile(filePath);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as PersistedSession;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return {};
    if (err.code === "EISDIR") {
      throw new Error(
        `Cannot read session file (${filePath}): path is a directory. HUBSPOT_MCP_TOKEN_PATH must point to a .json file.`,
      );
    }
    throw e;
  }
}

export async function writeSessionFile(
  filePath: string,
  session: PersistedSession,
): Promise<void> {
  await assertSessionPathIsAFile(filePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(session, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

export function parseSessionJson(raw: string): PersistedSession {
  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    throw new Error("Invalid JSON in session data");
  }
}
