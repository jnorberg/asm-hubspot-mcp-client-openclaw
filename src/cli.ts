#!/usr/bin/env node
import { Command } from "commander";
import { resolveAuthCode, resolveTokenPath } from "./env.js";
import { createHubSpotProviderFromEnv } from "./create-provider.js";
import { runAuthFlow } from "./auth-flow.js";
import { createBridgeClient, connectUpstream, createHubSpotTransport } from "./hubspot.js";
import { runStdioBridge } from "./bridge.js";
import { readPipedStdin } from "./stdin.js";

async function cmdAuth(codeFlag: string | undefined): Promise<void> {
  const sessionPath = resolveTokenPath();
  const piped = await readPipedStdin();
  const code = resolveAuthCode(
    codeFlag,
    process.env.HUBSPOT_MCP_AUTH_CODE,
    piped,
  );

  const provider = createHubSpotProviderFromEnv(sessionPath);

  const result = await runAuthFlow({
    provider,
    authorizationCode: code,
  });

  if (result === "REDIRECT") {
    process.stderr.write(
      "\nAfter authorizing in the browser, run the same command with the code:\n  hubspot-mcp-bridge auth --code <code>\n(or set HUBSPOT_MCP_AUTH_CODE, or pipe the code on stdin)\n",
    );
    return;
  }

  process.stderr.write("Authentication successful. Tokens saved.\n");
}

async function cmdPing(): Promise<void> {
  const sessionPath = resolveTokenPath();
  const provider = createHubSpotProviderFromEnv(sessionPath);
  const client = createBridgeClient();
  const transport = createHubSpotTransport(provider);
  try {
    await connectUpstream(client, transport);
    const tools = await client.listTools();
    process.stderr.write(
      `Connected. Upstream reports ${tools.tools?.length ?? 0} tool(s).\n`,
    );
  } finally {
    await client.close();
    await transport.close();
  }
}

async function cmdServe(): Promise<void> {
  const sessionPath = resolveTokenPath();
  const provider = createHubSpotProviderFromEnv(sessionPath);
  const client = createBridgeClient();
  const transport = createHubSpotTransport(provider);
  try {
    await connectUpstream(client, transport);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(
      `[hubspot-mcp-bridge] Upstream connection failed: ${msg}\n` +
        "Fix credentials/tokens or run: hubspot-mcp-bridge auth\n",
    );
    process.exitCode = 1;
    return;
  }
  await runStdioBridge(client);
}

const program = new Command();
program
  .name("hubspot-mcp-bridge")
  .description("stdio MCP bridge to HubSpot MCP (for OpenClaw and other MCP hosts)");

program
  .command("auth")
  .description("Headless OAuth: prints authorize URL, then exchange with --code / env / stdin")
  .option("--code <code>", "Authorization code from HubSpot redirect")
  .action(async (opts: { code?: string }) => {
    try {
      await cmdAuth(opts.code);
    } catch (e) {
      process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    }
  });

program
  .command("ping")
  .description("Verify upstream HubSpot MCP connectivity and list tool count")
  .action(async () => {
    try {
      await cmdPing();
    } catch (e) {
      process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    }
  });

program
  .command("serve", { isDefault: true })
  .description("Run the stdio MCP bridge (default command)")
  .action(async () => {
    try {
      await cmdServe();
    } catch (e) {
      process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
