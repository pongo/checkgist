import { describe, expect, it } from "vitest";

import { formatBrowserTitle } from "./browser-title";

describe("formatBrowserTitle", () => {
  it("suffixes a normal Source Metadata title", () => {
    expect(formatBrowserTitle("HdpnureE")).toBe("HdpnureE - Checkgist");
  });

  it("truncates long Source Metadata titles before suffixing them", () => {
    const title = "a".repeat(80);

    expect(formatBrowserTitle(title)).toBe(`${"a".repeat(57)}... - Checkgist`);
  });

  it("falls back to the app name for an empty title", () => {
    expect(formatBrowserTitle("   ")).toBe("Checkgist");
  });
});
