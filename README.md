# HubSpot MCP bridge for OpenClaw

A small Node.js CLI that runs as an **MCP server on stdio** (so hosts like OpenClaw can spawn it) and forwards requests to HubSpot’s **remote** MCP at `https://mcp.hubspot.com/` using the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) Streamable HTTP client with OAuth 2.1 + PKCE.

## HubSpot setup (MCP auth app)

HubSpot runs the **remote MCP service** at [`https://mcp.hubspot.com/`](https://mcp.hubspot.com/) (Streamable HTTP). You do **not** deploy or host your own MCP server binary on HubSpot. Instead, you create an **MCP auth app** in HubSpot: that OAuth client supplies the **client ID** and **client secret** this bridge uses to authenticate (OAuth 2.1 with **PKCE**, as required by HubSpot).

Official walkthrough: [Integrate AI tools with the HubSpot MCP server (BETA)](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-hubspot-mcp-server).

### Create the MCP auth app

1. Sign in to [HubSpot](https://www.hubspot.com/).
2. Open **Development** (from the main navigation or app switcher, depending on your account layout).
3. In the left sidebar, open **MCP Auth Apps**.
4. Click **Create MCP auth app**.
5. Fill in the form (all can be edited later via **Edit info** on the app details page):
   - **App name** — e.g. `OpenClaw HubSpot MCP`.
   - **Description** — optional.
   - **Redirect URL** — must **exactly** match what you set in `HUBSPOT_MCP_REDIRECT_URI` when using this bridge (including scheme, host, path, and trailing slash if any).  
     - For [MCP Inspector](https://github.com/modelcontextprotocol/inspector) testing, HubSpot documents adding **`http://localhost:6274/oauth/callback/debug`** as one of your redirect URLs (you can register **multiple** redirect URLs; the first is the default for some flows).
   - **Icon** — optional.
6. Click **Create**. HubSpot opens the app’s **details** page.

### Save your credentials

On the app details page, copy:

- **Client ID**
- **Client secret** (if shown; treat it like a password)

Put them into your environment (see [Environment](#environment)), e.g. `HUBSPOT_MCP_CLIENT_ID` and `HUBSPOT_MCP_CLIENT_SECRET` in `.env`. Never commit secrets to git.

### Scopes and permissions

You do **not** pick scopes manually when creating the app. Access is determined by the MCP tools HubSpot exposes and by what the installing user **grants** at install time, within their HubSpot permissions. If HubSpot adds new MCP capabilities later, users may need to **re-install** the app to approve new scopes.

### Optional: sanity-check with MCP Inspector

To verify OAuth and MCP against HubSpot before using this repo:

1. Install and run [MCP Inspector](https://github.com/modelcontextprotocol/inspector).
2. Set **Transport** to Streamable HTTP, **URL** to `https://mcp.hubspot.com/`, and paste your **Client ID** / **Client secret** from the MCP auth app.
3. Use **Guided OAuth Flow** in the inspector and confirm you can connect and list tools (e.g. `get_user_details` per HubSpot’s docs).

If the inspector works but this bridge does not, compare redirect URLs and env vars.

## Install

```bash
npm install
npm run build
```

`typescript` and `@types/node` are **dependencies** (not only devDependencies) so `npm run build` works even when dev packages are omitted (e.g. `npm install --omit=dev` or some minimal environments). Tests still need devDependencies (`npm install` with no flags, or `npm install --include=dev`).

Optionally link the binary globally:

```bash
npm link
```

## Install on OpenClaw (native plugin)

Complete **[HubSpot setup (MCP auth app)](#hubspot-setup-mcp-auth-app)** first so you have a client ID, client secret, and redirect URL that match your `.env`.

This package is an **OpenClaw gateway plugin**: when enabled, it loads in-process, connects to HubSpot MCP, and registers each upstream tool as a **native OpenClaw tool** (same idea as [openclaw-mcp-adapter](https://github.com/androidStern-personal/openclaw-mcp-adapter)).

**Plugin id:** `asm-hubspot-mcp-client-openclaw` (matches `package.json` `name`; see [`openclaw.plugin.json`](openclaw.plugin.json)).  
**Extension entry:** `package.json` → `"openclaw": { "extensions": ["./dist/openclaw/plugin.js"] }` — you must run **`npm run build`** so `dist/` exists before OpenClaw loads the package.

Official references: [Plugin setup & config](https://docs.openclaw.ai/plugins/sdk-setup), [CLI `plugins`](https://openclawlab.com/en/docs/cli/plugins/).

### 1. Build this repo

From a clone of this repository:

```bash
cd asm-hubspot-mcp-client-openclaw
npm install
npm run build
```

Confirm `dist/openclaw/plugin.js` exists.

### 2. Install the plugin into OpenClaw

Use the OpenClaw CLI (same machine where the gateway runs).

**Option A — Local folder (recommended for development / private GitHub)**

Links the directory without copying (adds it to OpenClaw’s plugin load paths):

```bash
openclaw plugins install -l /absolute/path/to/asm-hubspot-mcp-client-openclaw
```

Use the **absolute** path to the repo root (the folder that contains `package.json` and `openclaw.plugin.json`).

**Option B — From npm (after you publish this package)**

When the package is published to the npm registry under its name (e.g. `asm-hubspot-mcp-client-openclaw`):

```bash
openclaw plugins install asm-hubspot-mcp-client-openclaw
# optional: pin the resolved version
openclaw plugins install asm-hubspot-mcp-client-openclaw --pin
```

OpenClaw installs registry packages with `npm install --ignore-scripts`; your published tarball should include a **prebuilt** `dist/` (run `npm run build` before `npm publish`).

### 3. Enable the plugin

```bash
openclaw plugins enable asm-hubspot-mcp-client-openclaw
```

Check that it appears:

```bash
openclaw plugins list
openclaw plugins info asm-hubspot-mcp-client-openclaw
```

If something fails to load, run:

```bash
openclaw plugins doctor
```

### 4. Configure plugin options (optional)

Plugin-specific settings go under `plugins.entries.asm-hubspot-mcp-client-openclaw.config` in **`~/.openclaw/openclaw.json`** (or your OpenClaw state directory if `OPENCLAW_STATE_DIR` is set). Example:

```json5
{
  plugins: {
    entries: {
      "asm-hubspot-mcp-client-openclaw": {
        enabled: true,
        config: {
          toolPrefix: "hubspot",
          // sessionPath: "/optional/custom/path/session.json",
          // hubspotMcpUrl: "https://mcp.hubspot.com/"
        }
      }
    }
  }
}
```

| Config key | Purpose |
|------------|--------|
| `toolPrefix` | Prefix for tool names (default `hubspot` → e.g. `hubspot_get_user_details`). Use `""` for no prefix. |
| `sessionPath` | Override OAuth session JSON path (else `HUBSPOT_MCP_TOKEN_PATH` or default under `~/.config/hubspot-mcp-bridge/`). |
| `hubspotMcpUrl` | Override HubSpot MCP base URL (else `HUBSPOT_MCP_URL` or `https://mcp.hubspot.com/`). |

Exact JSON shape may vary slightly by OpenClaw version; align with your existing `plugins.entries` structure.

### 5. Set environment variables for the gateway

The plugin uses the same variables as the CLI. The **OpenClaw gateway process** must see them (export in the shell that starts the gateway, a process manager `EnvironmentFile`, etc.):

- `HUBSPOT_MCP_CLIENT_ID` (required)
- `HUBSPOT_MCP_CLIENT_SECRET` (if your HubSpot app uses a secret)
- `HUBSPOT_MCP_REDIRECT_URI` (must match your HubSpot MCP auth app), unless you only use env-injected tokens (see [Environment](#environment))

Optional: `HUBSPOT_MCP_TOKEN_PATH`, `HUBSPOT_MCP_URL`, `HUBSPOT_MCP_ACCESS_TOKEN`, `HUBSPOT_MCP_REFRESH_TOKEN`.

### 6. Authenticate once (session file)

Before relying on the plugin, complete OAuth so the session file exists (same paths as the CLI):

```bash
cd /absolute/path/to/asm-hubspot-mcp-client-openclaw
set -a && source .env && set +a   # or export vars manually
npm run build
node dist/cli.js auth
# complete browser flow, then:
node dist/cli.js auth --code '<authorization-code>'
node dist/cli.js ping            # should report tool count
```

Alternatively inject `HUBSPOT_MCP_ACCESS_TOKEN` / `HUBSPOT_MCP_REFRESH_TOKEN` into the gateway environment and skip the file.

### 7. Restart the gateway

Restart OpenClaw so the plugin loads with your env and config, for example:

```bash
openclaw gateway restart
```

(Use the restart command your OpenClaw version documents if this differs.)

### Plugin vs stdio MCP server

| Mode | Use when |
|------|----------|
| **Plugin** (`asm-hubspot-mcp-client-openclaw` id) | You want HubSpot tools registered **inside** the OpenClaw gateway (in-process). Follow this section. |
| **`hubspot-mcp-bridge` CLI `serve`** | You configure OpenClaw (or another host) to spawn a **stdio** MCP subprocess — see [OpenClaw configuration (stdio MCP)](#openclaw-configuration-stdio-mcp) below. |

Use **one** approach for a given setup, not both.

### Troubleshooting

- **`dist/` missing:** Run `npm run build` in this repo before `openclaw plugins install -l` or before publishing.
- **Plugin id mismatch warning:** OpenClaw expects the manifest `id` to match the npm package name. This repo keeps them in sync via **`src/openclaw/plugin-id.ts`** (reads `package.json`) and **tests** (`npm test`). Use `plugins.entries.<package-name>` (e.g. `asm-hubspot-mcp-client-openclaw`). If you enabled an older id, disable it and enable the matching entry, and merge any `config`.
- **401 / no tools:** Confirm env vars reach the gateway and that `auth` + `ping` work from the CLI on the same host.

#### Stale `hubspot-mcp-bridge` / “Config invalid” / `plugins.allow`

Older instructions used the plugin id **`hubspot-mcp-bridge`**. The id now **must** match **`package.json` `name`**: **`asm-hubspot-mcp-client-openclaw`**. If your config still mentions `hubspot-mcp-bridge`, OpenClaw may report:

- `plugins.entries.hubspot-mcp-bridge: plugin not found … stale config entry ignored`
- `plugins.allow: plugin not found: hubspot-mcp-bridge`
- `Config invalid`

**Fix:**

1. Edit **`~/.openclaw/openclaw.json`** (or your `OPENCLAW_STATE_DIR` config):

   - Under **`plugins.allow`** (if present): remove **`hubspot-mcp-bridge`**. Add **`asm-hubspot-mcp-client-openclaw`** if your setup uses an explicit allowlist and the new id is not already listed.
   - Under **`plugins.entries`**: **delete** the **`hubspot-mcp-bridge`** key. If you had `config` there, recreate it under **`asm-hubspot-mcp-client-openclaw`** (same shape as in **Configure plugin options** under [Install on OpenClaw](#install-on-openclaw-native-plugin) above).

2. Run:

   ```bash
   openclaw doctor --fix
   ```

3. From this repo (after `npm run build`):

   ```bash
   openclaw plugins install -l .
   openclaw plugins enable asm-hubspot-mcp-client-openclaw
   ```

4. Restart the gateway.

If anything still references `hubspot-mcp-bridge` except the **CLI binary name** `hubspot-mcp-bridge` in `package.json` `bin`, remove or rename it in OpenClaw config only.

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
| `hubspot-mcp-bridge logout` | Clear the session file (tokens, PKCE verifier, discovery cache) so you can **`auth` again**—e.g. after HubSpot MCP scope/tool changes or to switch accounts. |
| `hubspot-mcp-bridge ping` | Connect upstream and list tool count (sanity check). |

If you use **`HUBSPOT_MCP_ACCESS_TOKEN`** / **`HUBSPOT_MCP_REFRESH_TOKEN`**, `logout` only clears the file; unset those env vars for a full reset.

## OpenClaw configuration (stdio MCP)

If you prefer **not** to use the native plugin, you can configure OpenClaw to spawn this CLI as an **stdio MCP server**. Point `command` at the built CLI and pass the same env vars. Example:

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

`npm test` includes a check that **`openclaw.plugin.json` `id` equals `package.json` `name`** and matches the runtime plugin entry. That alignment is what OpenClaw expects; if you rename the package, update the manifest `id` and let tests confirm—otherwise users see a plugin id mismatch warning.

## Disclosure (AI-assisted development)

This repository was **developed with AI coding tools** (LLM-based assistants) and **reviewed by humans** before publication. That mix is increasingly common: the tools accelerate implementation, while maintainers remain responsible for correctness, security review, and fit for purpose.

**You should still** run your own review, tests, and security assessment before using this software with real HubSpot data or in production—especially for OAuth tokens, API access, and OpenClaw gateway configuration.

There is no single industry-standard disclaimer; transparency about AI assistance plus human oversight matches what many open-source and corporate AI policies suggest.

## References

- [Integrate AI tools with the HubSpot MCP server (BETA)](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-hubspot-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
