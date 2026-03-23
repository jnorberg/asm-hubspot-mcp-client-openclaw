import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readSessionFile,
  writeSessionFile,
  parseSessionJson,
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
});
