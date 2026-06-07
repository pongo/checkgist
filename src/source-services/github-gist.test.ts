import { ofetch } from "ofetch";
import type { $Fetch } from "ofetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { githubGistService } from "./github-gist";
import { SourceLoadError } from "./types";

const ofetchMock = vi.hoisted(() => vi.fn<$Fetch>());

vi.mock("ofetch", () => ({
  ofetch: ofetchMock,
}));

const mockedOfetch = vi.mocked(ofetch);

describe("githubGistService.load", () => {
  beforeEach(() => {
    mockedOfetch.mockReset();
  });

  it("loads a gist and maps metadata and files in API object value order", async () => {
    const signal = new AbortController().signal;
    mockedOfetch.mockResolvedValueOnce({
      description: "  Release checklist  ",
      html_url: "https://gist.github.com/octocat/gist-1",
      files: {
        "b.md": {
          filename: "b.md",
          content: "- [ ] second",
          truncated: false,
        },
        "a.md": {
          filename: "a.md",
          content: "- [ ] first",
          truncated: false,
        },
      },
    });

    const source = await githubGistService.load(
      { type: "github-gist", gistId: "gist-1" },
      { signal },
    );

    expect(mockedOfetch).toHaveBeenCalledWith("https://api.github.com/gists/gist-1", { signal });
    expect(source).toEqual({
      reference: { type: "github-gist", gistId: "gist-1" },
      metadata: {
        title: "Release checklist",
        description: "Release checklist",
        url: "https://gist.github.com/octocat/gist-1",
      },
      files: [
        {
          status: "ready",
          id: "b.md",
          name: "b.md",
          content: "- [ ] second",
        },
        {
          status: "ready",
          id: "a.md",
          name: "a.md",
          content: "- [ ] first",
        },
      ],
    });
  });

  it("omits empty descriptions and uses a deterministic source URL fallback", async () => {
    mockedOfetch.mockResolvedValueOnce({
      description: "   ",
      files: {
        "todo.md": {
          filename: "todo.md",
          content: "- [ ] task",
          truncated: false,
        },
      },
    });

    const source = await githubGistService.load({
      type: "github-gist",
      gistId: "gist-2",
    });

    expect(source.metadata).toEqual({
      title: "gist-2",
      url: "https://gist.github.com/gist-2",
    });
  });

  it("loads full content for truncated files from their raw URL", async () => {
    const signal = new AbortController().signal;
    mockedOfetch.mockResolvedValueOnce({
      description: null,
      files: {
        "large.md": {
          filename: "large.md",
          content: "truncated preview",
          truncated: true,
          raw_url: "https://gist.githubusercontent.com/raw-large",
        },
      },
    });
    mockedOfetch.mockResolvedValueOnce("- [ ] full content");

    const source = await githubGistService.load(
      { type: "github-gist", gistId: "gist-3" },
      { signal },
    );

    expect(mockedOfetch).toHaveBeenNthCalledWith(
      2,
      "https://gist.githubusercontent.com/raw-large",
      { signal },
    );
    expect(source.files).toEqual([
      {
        status: "ready",
        id: "large.md",
        name: "large.md",
        content: "- [ ] full content",
      },
    ]);
  });

  it("returns a file-level error when a truncated raw file fetch fails", async () => {
    mockedOfetch.mockResolvedValueOnce({
      files: {
        "large.md": {
          filename: "large.md",
          truncated: true,
          raw_url: "https://gist.githubusercontent.com/raw-large",
        },
      },
    });
    mockedOfetch.mockRejectedValueOnce(new Error("raw failed"));

    const source = await githubGistService.load({
      type: "github-gist",
      gistId: "gist-4",
    });

    expect(source.files).toEqual([
      {
        status: "error",
        id: "large.md",
        name: "large.md",
        error: {
          message: "Failed to load full content for this truncated gist file.",
        },
      },
    ]);
  });

  it("throws a source-level load error when the Gist API request fails", async () => {
    mockedOfetch.mockRejectedValueOnce(new Error("api failed"));

    await expect(
      githubGistService.load({ type: "github-gist", gistId: "gist-5" }),
    ).rejects.toMatchObject({
      name: SourceLoadError.name,
      message: "Failed to load GitHub Gist.",
    });
  });

  it("throws a source-level load error when the gist has no files", async () => {
    mockedOfetch.mockResolvedValueOnce({ files: {} });

    await expect(githubGistService.load({ type: "github-gist", gistId: "gist-6" })).rejects.toThrow(
      "No files found in this gist.",
    );
  });
});
