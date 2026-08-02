import { beforeEach, describe, expect, it, vi } from "vitest";

import { githubGistService } from "./github-gist.ts";
import type { SourceFetcher } from "../types.ts";
import { SourceLoadError } from "../types.ts";

describe("githubGistService.load", () => {
  const fetcherMock =
    vi.fn<(url: string, options?: { signal?: AbortSignal }) => Promise<unknown>>();
  const fetcher: SourceFetcher = async <TResponse>(
    url: string,
    options?: { signal?: AbortSignal },
  ) => (await fetcherMock(url, options)) as TResponse;

  beforeEach(() => {
    fetcherMock.mockReset();
  });

  it("loads a gist and maps metadata and files in API object value order", async () => {
    const signal = new AbortController().signal;
    fetcherMock.mockResolvedValueOnce({
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
      { fetcher, signal },
    );

    expect(fetcherMock).toHaveBeenCalledWith("https://api.github.com/gists/gist-1", { signal });
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
    fetcherMock.mockResolvedValueOnce({
      description: "   ",
      files: {
        "todo.md": {
          filename: "todo.md",
          content: "- [ ] task",
          truncated: false,
        },
      },
    });

    const source = await githubGistService.load(
      {
        type: "github-gist",
        gistId: "gist-2",
      },
      { fetcher },
    );

    expect(source.metadata).toEqual({
      title: "todo.md",
      url: "https://gist.github.com/gist-2",
    });
  });

  it("uses the gist ID when the description and first file name are empty", async () => {
    fetcherMock.mockResolvedValueOnce({
      description: "   ",
      files: {
        unnamed: {
          filename: "",
          content: "- [ ] task",
          truncated: false,
        },
      },
    });

    const source = await githubGistService.load(
      { type: "github-gist", gistId: "gist-with-unnamed-file" },
      { fetcher },
    );

    expect(source.metadata.title).toBe("gist-with-unnamed-file");
  });

  it("uses stable defaults when optional file fields are absent", async () => {
    fetcherMock.mockResolvedValueOnce({
      description: null,
      files: {
        unnamed: {},
      },
    });

    const source = await githubGistService.load(
      { type: "github-gist", gistId: "gist-with-missing-file-fields" },
      { fetcher },
    );

    expect(source).toEqual({
      reference: { type: "github-gist", gistId: "gist-with-missing-file-fields" },
      metadata: {
        title: "Untitled",
        url: "https://gist.github.com/gist-with-missing-file-fields",
      },
      files: [
        {
          status: "ready",
          id: "Untitled",
          name: "Untitled",
          content: "",
        },
      ],
    });
  });

  it("loads full content for truncated files from their raw URL", async () => {
    const signal = new AbortController().signal;
    fetcherMock.mockResolvedValueOnce({
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
    fetcherMock.mockResolvedValueOnce("- [ ] full content");

    const source = await githubGistService.load(
      { type: "github-gist", gistId: "gist-3" },
      { fetcher, signal },
    );

    expect(fetcherMock).toHaveBeenNthCalledWith(2, "https://gist.githubusercontent.com/raw-large", {
      signal,
    });
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
    fetcherMock.mockResolvedValueOnce({
      files: {
        "large.md": {
          filename: "large.md",
          truncated: true,
          raw_url: "https://gist.githubusercontent.com/raw-large",
        },
      },
    });
    fetcherMock.mockRejectedValueOnce(new Error("raw failed"));

    const source = await githubGistService.load(
      {
        type: "github-gist",
        gistId: "gist-4",
      },
      { fetcher },
    );

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

  it("returns a file-level error when a truncated file has no raw URL", async () => {
    fetcherMock.mockResolvedValueOnce({
      files: {
        "large.md": {
          filename: "large.md",
          truncated: true,
        },
      },
    });

    const source = await githubGistService.load(
      { type: "github-gist", gistId: "gist-without-raw-url" },
      { fetcher },
    );

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
    fetcherMock.mockRejectedValueOnce(new Error("api failed"));

    await expect(
      githubGistService.load({ type: "github-gist", gistId: "gist-5" }, { fetcher }),
    ).rejects.toMatchObject({
      name: SourceLoadError.name,
      message: "Failed to load GitHub Gist.",
    });
  });

  it("throws a source-level load error when the gist has no files", async () => {
    fetcherMock.mockResolvedValueOnce({ files: {} });

    await expect(
      githubGistService.load({ type: "github-gist", gistId: "gist-6" }, { fetcher }),
    ).rejects.toThrow("No files found in this gist.");
  });
});
