import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * OpenClaw resolves plugin identity from the npm package name. The manifest
 * `openclaw.plugin.json` `id` and `registerService({ id })` must use the same
 * string as `package.json` `name`, or the gateway reports a plugin id mismatch.
 */
function readPackageName(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/openclaw/ or dist/openclaw/ → repo root
  const pkgPath = join(here, "../../package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { name?: string };
  if (!pkg.name || typeof pkg.name !== "string") {
    throw new Error(`Invalid package.json at ${pkgPath}: missing name`);
  }
  return pkg.name;
}

export const OPENCLAW_PLUGIN_ID: string = readPackageName();
