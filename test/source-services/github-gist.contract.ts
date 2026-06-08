import { describe, expect, it } from "vitest";

import { githubGistService } from "@/source-services/github-gist";

describe("githubGistService live contract", () => {
  it("loads a known public one-file gist", async () => {
    const gistId = "6850950b2f317048e6c59fe2878c1fda";

    const source = await githubGistService.load({ type: "github-gist", gistId });

    expect(source.reference).toEqual({ type: "github-gist", gistId });
    expect(source.metadata.url).toBe(`https://gist.github.com/pongo/${gistId}`);
    expect(source.files).toHaveLength(1);
    expect(source.files[0]).toMatchObject({ status: "ready" });
    expect(source.files[0]?.name).toEqual(expect.any(String));
    expect(
      source.files[0]?.status === "ready" ? source.files[0].content.length : 0,
    ).toBeGreaterThan(0);
  }, 30_000);

  it("loads a known public multi-file gist", async () => {
    const gistId = "289bcae2779c276e558df7f12993c770";

    const source = await githubGistService.load({ type: "github-gist", gistId });

    expect(source.reference).toEqual({ type: "github-gist", gistId });
    expect(source.metadata.url).toBe(`https://gist.github.com/pongo/${gistId}`);
    expect(source.files).toHaveLength(2);
    expect(source.files.every((file) => file.status === "ready")).toBe(true);
    expect(
      source.files
        .map((file) => (file.status === "ready" ? file.content.length : 0))
        .every((contentLength) => contentLength > 0),
    ).toBe(true);
  }, 30_000);
});
