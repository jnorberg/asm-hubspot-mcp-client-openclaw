import fs from "node:fs/promises";
import path from "node:path";
import type { OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

export interface PersistedSession {
  tokens?: OAuthTokens;
  codeVerifier?: string;
  discoveryState?: OAuthDiscoveryState;
}

export async function readSessionFile(filePath: string): Promise<PersistedSession> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as PersistedSession;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return {};
    throw e;
  }
}

export async function writeSessionFile(
  filePath: string,
  session: PersistedSession,
): Promise<void> {
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
