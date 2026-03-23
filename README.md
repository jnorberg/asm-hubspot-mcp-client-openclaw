# HubSpot MCP bridge for OpenClaw

A small Node.js CLI that runs as an **MCP server on stdio** (so hosts like OpenClaw can spawn it) and forwards requests to HubSpot’s **remote** MCP at `https://mcp.hubspot.com/` using the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) Streamable HTTP client with OAuth 2.1 + PKCE.

## Prerequisites

1. In HubSpot: **Development → MCP Auth Apps → Create MCP auth app**.
2. Register a **redirect URL** that matches `HUBSPOT_MCP_REDIRECT_URI` (for example `https://localhost/oauth/callback` or the URL HubSpot documents for your flow).
3. Copy the app’s **client ID** and **client secret**.

## Install

```bash
npm install
npm run build
```

Optionally link the binary globally:

```bash
npm link
```

## OpenClaw plugin (native tools)

This package is also an **OpenClaw extension**: it connects to HubSpot MCP when the gateway starts and registers each upstream tool as a **native OpenClaw tool** (same pattern as [openclaw-mcp-adapter](https://github.com/androidStern-personal/openclaw-mcp-adapter)).

- **Manifest:** [`openclaw.plugin.json`](openclaw.plugin.json)
- **Entry:** `package.json` → `"openclaw": { "extensions": ["./dist/openclaw/plugin.js"] }` (after `npm run build`)

### Install into OpenClaw

Exact steps depend on your OpenClaw version; typical approaches:

1. **npm link / path install** — from this repo: `npm run build`, then `npm link` (or install from a `file:` path), and ensure OpenClaw loads the package as a plugin.
2. **Config** — enable the plugin and pass optional settings under `plugins.entries` / `config` (see `openclaw.plugin.json` `configSchema`):

| Config key | Purpose |
|------------|--------|
| `toolPrefix` | Prefix for tool names (default `hubspot` → e.g. `hubspot_get_user_details`). Use `""` for no prefix. |
| `sessionPath` | Override token/session JSON path (else `HUBSPOT_MCP_TOKEN_PATH` or default file path). |
| `hubspotMcpUrl` | Override MCP base URL (else `HUBSPOT_MCP_URL` or `https://mcp.hubspot.com/`). |

**Secrets stay in environment** (same as the CLI): `HUBSPOT_MCP_CLIENT_ID`, `HUBSPOT_MCP_CLIENT_SECRET`, and tokens via session file or `HUBSPOT_MCP_ACCESS_TOKEN` / `HUBSPOT_MCP_REFRESH_TOKEN`. Run `hubspot-mcp-bridge auth` once so the session file exists before starting the gateway, unless you inject tokens by env.

### Plugin vs stdio `serve`

| Mode | Use when |
|------|----------|
| **Plugin** | OpenClaw loads this package; tools appear directly on the agent. |
| **`hubspot-mcp-bridge` / `serve`** | Another host speaks MCP over stdio only (MCP subprocess). |

You normally use **one** of these for OpenClaw, not both.

## Environment

See [`.env.example`](.env.example). Minimum for OAuth:

- `HUBSPOT_MCP_CLIENT_ID`
- `HUBSPOT_MCP_CLIENT_SECRET` (if your app is confidential)
- `HUBSPOT_MCP_REDIRECT_URI` (must match the HubSpot app)

Optional:

- `HUBSPOT_MCP_TOKEN_PATH` — session file (tokens, PKCE verifier, discovery cache). Default: `~/.config/hubspot-mcp-bridge/session.json`.
- `HUBSPOT_MCP_ACCESS_TOKEN` / `HUBSPOT_MCP_REFRESH_TOKEN` — skip the session file and inject tokens (useful in containers or secret managers). If `HUBSPOT_MCP_REDIRECT_URI` is omitted but an access token is set, `https://localhost/` is used as a placeholder for OAuth metadata only; you should still set a real redirect when using `auth`.

## Headless authentication

1. **Start the flow** (prints the HubSpot authorize URL to stdout; no browser is opened on this machine):

   ```bash
   set -a && source .env && set +a
   hubspot-mcp-bridge auth
   ```

2. Open that URL in a browser (any device), complete install/consent, then copy the **authorization code** from the redirect (or from HubSpot’s UI, depending on your redirect setup).

3. **Exchange the code**:

   ```bash
   hubspot-mcp-bridge auth --code <code>
   # or: HUBSPOT_MCP_AUTH_CODE=<code> hubspot-mcp-bridge auth
   # or: echo '<code>' | hubspot-mcp-bridge auth
   ```

Tokens are written to the session file unless you use env-injected tokens only.

## Commands

| Command | Purpose |
|--------|---------|
| `hubspot-mcp-bridge` or `hubspot-mcp-bridge serve` | Run the **stdio** MCP bridge (used by OpenClaw). |
| `hubspot-mcp-bridge auth` | OAuth: print URL, then exchange code with `--code` / env / stdin. |
| `hubspot-mcp-bridge ping` | Connect upstream and list tool count (sanity check). |

## OpenClaw configuration

Point `command` at the built CLI and pass the same env vars. Example:

```json
{
  "mcpServers": {
    "hubspot": {
      "command": "node",
      "args": ["/absolute/path/to/asm-hubspot-mcp-client-openclaw/dist/cli.js"],
      "transport": "stdio",
      "env": {
        "HUBSPOT_MCP_CLIENT_ID": "${HUBSPOT_MCP_CLIENT_ID}",
        "HUBSPOT_MCP_CLIENT_SECRET": "${HUBSPOT_MCP_CLIENT_SECRET}",
        "HUBSPOT_MCP_REDIRECT_URI": "${HUBSPOT_MCP_REDIRECT_URI}",
        "HUBSPOT_MCP_TOKEN_PATH": "${HUBSPOT_MCP_TOKEN_PATH}"
      }
    }
  }
}
```

Restart the OpenClaw gateway after changes. Exact config keys depend on your OpenClaw version.

## Development

```bash
npm test
npm run build
```

## References

- [Integrate AI tools with the HubSpot MCP server (BETA)](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-hubspot-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
