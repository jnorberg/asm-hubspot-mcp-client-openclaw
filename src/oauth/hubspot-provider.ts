import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  readSessionFile,
  writeSessionFile,
  type PersistedSession,
} from "./token-store.js";

export interface HubSpotProviderOptions {
  clientId: string;
  clientSecret: string;
  /** Must match HubSpot MCP auth app redirect URL */
  redirectUri: string;
  sessionPath: string;
  /** If set, skip file-backed access/refresh tokens */
  envAccessToken?: string;
  envRefreshToken?: string;
  /** Where to print the authorize URL in headless mode */
  printAuthUrl?: (url: URL) => void;
}

/**
 * OAuth provider for HubSpot MCP: static client_id/client_secret from a HubSpot MCP auth app,
 * persisted tokens + PKCE verifier + discovery state in session file.
 */
export class HubSpotOAuthProvider implements OAuthClientProvider {
  private session: PersistedSession = {};
  private loaded = false;

  constructor(private readonly opts: HubSpotProviderOptions) {}

  get redirectUrl(): string {
    return this.opts.redirectUri;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.opts.redirectUri],
      client_name: "hubspot-mcp-bridge",
    };
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const { clientId, clientSecret } = this.opts;
    if (!clientSecret) {
      return { client_id: clientId };
    }
    return {
      client_id: clientId,
      client_secret: clientSecret,
    };
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    await this.ensureLoaded();
    if (this.opts.envAccessToken) {
      return {
        access_token: this.opts.envAccessToken,
        token_type: "Bearer",
        ...(this.opts.envRefreshToken
          ? { refresh_token: this.opts.envRefreshToken }
          : {}),
      };
    }
    return this.session.tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await this.ensureLoaded();
    this.session.tokens = tokens;
    await writeSessionFile(this.opts.sessionPath, this.session);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    const fn = this.opts.printAuthUrl ?? ((url) => process.stdout.write(`${url.toString()}\n`));
    fn(authorizationUrl);
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.ensureLoaded();
    this.session.codeVerifier = codeVerifier;
    await writeSessionFile(this.opts.sessionPath, this.session);
  }

  async codeVerifier(): Promise<string> {
    await this.ensureLoaded();
    const v = this.session.codeVerifier;
    if (!v) throw new Error("Missing PKCE code verifier — run auth without --code first.");
    return v;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await this.ensureLoaded();
    this.session.discoveryState = state;
    await writeSessionFile(this.opts.sessionPath, this.session);
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    await this.ensureLoaded();
    return this.session.discoveryState;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery",
  ): Promise<void> {
    await this.ensureLoaded();
    if (scope === "all") {
      this.session = {};
    } else if (scope === "tokens") {
      delete this.session.tokens;
    } else if (scope === "verifier") {
      delete this.session.codeVerifier;
    } else if (scope === "discovery") {
      delete this.session.discoveryState;
    } else if (scope === "client") {
      /* static client — no-op */
    }
    await writeSessionFile(this.opts.sessionPath, this.session);
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.session = await readSessionFile(this.opts.sessionPath);
    this.loaded = true;
  }
}
