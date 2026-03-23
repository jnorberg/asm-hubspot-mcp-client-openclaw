import { describe, it, expect } from "vitest";
import { resolveAuthCode } from "../src/env.js";

describe("resolveAuthCode", () => {
  it("prefers flag over env and stdin", () => {
    expect(resolveAuthCode("a", "b", "c")).toBe("a");
  });

  it("uses env when no flag", () => {
    expect(resolveAuthCode(undefined, "b", "c")).toBe("b");
  });

  it("uses stdin when only stdin", () => {
    expect(resolveAuthCode(undefined, undefined, "c")).toBe("c");
  });

  it("trims whitespace", () => {
    expect(resolveAuthCode("  x  ", undefined, undefined)).toBe("x");
  });
});
