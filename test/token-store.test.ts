import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readSessionFile,
  writeSessionFile,
  parseSessionJson,
  clearPersistedSession,
} from "../src/oauth/token-store.js";

describe("token-store", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hsmcp-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("readSessionFile returns {} for missing file", async () => {
    const p = path.join(tmpDir, "nope.json");
    const s = await readSessionFile(p);
    expect(s).toEqual({});
  });

  it("writeSessionFile round-trips", async () => {
    const p = path.join(tmpDir, "session.json");
    await writeSessionFile(p, {
      tokens: {
        access_token: "a",
        token_type: "Bearer",
      },
    });
    const s = await readSessionFile(p);
    expect(s.tokens?.access_token).toBe("a");
  });

  it("parseSessionJson throws on invalid JSON", () => {
    expect(() => parseSessionJson("{")).toThrow(/Invalid JSON/);
  });

  it("readSessionFile rejects a directory path (EISDIR / misconfigured HUBSPOT_MCP_TOKEN_PATH)", async () => {
    await expect(readSessionFile(tmpDir)).rejects.toThrow(/directory/);
  });

  it("writeSessionFile rejects a directory path", async () => {
    await expect(writeSessionFile(tmpDir, {})).rejects.toThrow(/directory/);
  });

  it("clearPersistedSession empties tokens for re-auth", async () => {
    const p = path.join(tmpDir, "session.json");
    await writeSessionFile(p, {
      tokens: { access_token: "x", token_type: "Bearer" },
      codeVerifier: "cv",
    });
    await clearPersistedSession(p);
    const s = await readSessionFile(p);
    expect(s).toEqual({});
  });
});
