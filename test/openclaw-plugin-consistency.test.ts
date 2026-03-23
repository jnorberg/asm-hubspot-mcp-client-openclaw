import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { OPENCLAW_PLUGIN_ID } from "../src/openclaw/plugin-id.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string };
const manifest = JSON.parse(readFileSync(join(root, "openclaw.plugin.json"), "utf8")) as {
  id: string;
};

describe("OpenClaw plugin id (prevents gateway mismatch warning)", () => {
  it("openclaw.plugin.json id matches package.json name", () => {
    expect(manifest.id).toBe(pkg.name);
  });

  it("runtime OPENCLAW_PLUGIN_ID matches package.json name", () => {
    expect(OPENCLAW_PLUGIN_ID).toBe(pkg.name);
  });
});
