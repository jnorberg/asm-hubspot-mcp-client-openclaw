import { describe, it, expect } from "vitest";
import { parseOpenClawPluginConfig } from "../src/openclaw/config.js";

describe("parseOpenClawPluginConfig", () => {
  it("defaults toolPrefix", () => {
    expect(parseOpenClawPluginConfig({})).toEqual({ toolPrefix: "hubspot" });
    expect(parseOpenClawPluginConfig(null)).toEqual({ toolPrefix: "hubspot" });
  });

  it("reads optional fields", () => {
    expect(
      parseOpenClawPluginConfig({
        toolPrefix: "hs",
        sessionPath: "/tmp/s.json",
        hubspotMcpUrl: "https://mcp.hubspot.com/",
      }),
    ).toEqual({
      toolPrefix: "hs",
      sessionPath: "/tmp/s.json",
      hubspotMcpUrl: "https://mcp.hubspot.com/",
    });
  });

  it("allows empty toolPrefix", () => {
    expect(parseOpenClawPluginConfig({ toolPrefix: "" })).toEqual({ toolPrefix: "" });
  });
});
