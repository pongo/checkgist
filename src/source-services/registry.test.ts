import { describe, expect, it } from "vitest";

import {
  createSourceRegistry,
  referenceFromRoute,
  referenceFromUrlInput,
  routeForReference,
} from "./registry";
import type { SourceReference, SourceService } from "./types";

describe("source service registry", () => {
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
    [["gist.github.com", "0123456789abcdef"], {
      type: "github-gist",
      gistId: "0123456789abcdef",
    }],
    [["pastebin.com", "HdpnureE"], { type: "pastebin", pasteId: "HdpnureE" }],
  ])("parses canonical route %s", (path, expectedReference) => {
    expect(referenceFromRoute(path)).toEqual(expectedReference);
  });

  it("uses deterministic first-match resolution", () => {
    const firstService: SourceService<SourceReference> = {
      type: "github-gist",
      fromUrl: () => ({ type: "github-gist", gistId: "first" }),
      fromRoute: () => ({ type: "github-gist", gistId: "first" }),
      toRoute: () => ["first"],
      load: async () => {
        throw new Error("Not used by this test.");
      },
    };
    const secondService: SourceService<SourceReference> = {
      type: "pastebin",
      fromUrl: () => ({ type: "pastebin", pasteId: "second" }),
      fromRoute: () => ({ type: "pastebin", pasteId: "second" }),
      toRoute: () => ["second"],
      load: async () => {
        throw new Error("Not used by this test.");
      },
    };
    const registry = createSourceRegistry([firstService, secondService]);

    expect(referenceFromUrlInput("https://example.com/source", registry)).toEqual({
      type: "github-gist",
      gistId: "first",
    });
    expect(referenceFromRoute(["example.com", "source"], registry)).toEqual({
      type: "github-gist",
      gistId: "first",
    });
  });
});
