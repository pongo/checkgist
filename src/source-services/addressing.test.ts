import { describe, expect, it } from "vitest";

import {
  createSourceAddressCatalog,
  referenceFromRoute,
  referenceFromUrlInput,
  routeForReference,
  routeForUrlInput,
} from "./addressing";
import type { SourceAddressRule } from "./addressing";
import type { SourceReference } from "./types";

describe("source addressing", () => {
  it.each([
    [
      "https://gist.github.com/octocat/0123456789abcdef?file=one.md#hash",
      { type: "github-gist", gistId: "0123456789abcdef" },
      "/gist.github.com/0123456789abcdef",
    ],
    [
      "http://gist.github.com/0123456789abcdef/",
      { type: "github-gist", gistId: "0123456789abcdef" },
      "/gist.github.com/0123456789abcdef",
    ],
    [
      "gist.github.com/octocat/0123456789abcdef/",
      { type: "github-gist", gistId: "0123456789abcdef" },
      "/gist.github.com/0123456789abcdef",
    ],
    [
      "https://pastebin.com/HdpnureE?utm_source=test#L1",
      { type: "pastebin", pasteId: "HdpnureE" },
      "/pastebin.com/HdpnureE",
    ],
    [
      "http://pastebin.com/raw/HdpnureE/",
      { type: "pastebin", pasteId: "HdpnureE" },
      "/pastebin.com/HdpnureE",
    ],
    [
      "pastebin.com/raw/HdpnureE/",
      { type: "pastebin", pasteId: "HdpnureE" },
      "/pastebin.com/HdpnureE",
    ],
  ])("normalizes %s", (input, expectedReference, expectedRoute) => {
    const reference = referenceFromUrlInput(input);

    expect(reference).toEqual(expectedReference);
    expect(routeForReference(reference as SourceReference)).toBe(expectedRoute);
    expect(routeForUrlInput(input)).toBe(expectedRoute);
  });

  it.each([
    "HdpnureE",
    "https://example.com/HdpnureE",
    "ftp://pastebin.com/HdpnureE",
    "https://gist.github.com/octocat/0123456789abcdef/revisions",
    "https://pastebin.com/raw/",
  ])("rejects unsupported or ambiguous input %s", (input) => {
    expect(referenceFromUrlInput(input)).toBeNull();
  });

  it.each([
    [
      ["gist.github.com", "0123456789abcdef"],
      {
        type: "github-gist",
        gistId: "0123456789abcdef",
      },
    ],
    [["pastebin.com", "HdpnureE"], { type: "pastebin", pasteId: "HdpnureE" }],
  ])("parses canonical route %s", (path, expectedReference) => {
    expect(referenceFromRoute(path)).toEqual(expectedReference);
  });

  it("uses deterministic first-match resolution", () => {
    const firstRule: SourceAddressRule = {
      type: "github-gist",
      name: "first-source",
      path: "/first/:id",
      fromUrl: () => ({ type: "github-gist", gistId: "first" }),
      fromRoute: () => ({ type: "github-gist", gistId: "first" }),
      toRouteSegments: () => ["first"],
    };
    const secondRule: SourceAddressRule = {
      type: "pastebin",
      name: "second-source",
      path: "/second/:id",
      fromUrl: () => ({ type: "pastebin", pasteId: "second" }),
      fromRoute: () => ({ type: "pastebin", pasteId: "second" }),
      toRouteSegments: () => ["second"],
    };
    const catalog = createSourceAddressCatalog([firstRule, secondRule]);

    expect(referenceFromUrlInput("https://example.com/source", catalog)).toEqual({
      type: "github-gist",
      gistId: "first",
    });
    expect(referenceFromRoute(["example.com", "source"], catalog)).toEqual({
      type: "github-gist",
      gistId: "first",
    });
  });
});
