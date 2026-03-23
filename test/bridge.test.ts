import { describe, it, expect, vi } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { bridgeCapabilities, registerForwardingHandlers } from "../src/bridge.js";

describe("bridgeCapabilities", () => {
  it("maps upstream tools/resources/prompts flags", () => {
    expect(bridgeCapabilities({ tools: {} })).toEqual({ tools: {} });
    expect(bridgeCapabilities({ resources: {} })).toEqual({ resources: {} });
    expect(bridgeCapabilities({ prompts: {} })).toEqual({ prompts: {} });
    expect(bridgeCapabilities(undefined)).toEqual({});
  });
});

describe("registerForwardingHandlers", () => {
  it("registers without throwing when upstream exposes tools", () => {
    const upstream = {
      getServerCapabilities: () => ({ tools: {} }),
      listTools: vi.fn().mockResolvedValue({ tools: [] }),
      callTool: vi.fn().mockResolvedValue({ content: [] }),
    } as unknown as Client;

    const server = new Server({ name: "test", version: "0" }, { capabilities: { tools: {} } });
    expect(() => registerForwardingHandlers(server, upstream)).not.toThrow();
  });
});
