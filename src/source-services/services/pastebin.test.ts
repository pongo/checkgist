import { beforeEach, describe, expect, it, vi } from "vitest";

import { pastebinService } from "./pastebin.ts";
import type { SourceFetcher } from "../types.ts";
import { SourceLoadError } from "../types.ts";

describe("pastebinService.load", () => {
  const fetcherMock =
    vi.fn<(url: string, options?: { signal?: AbortSignal }) => Promise<unknown>>();
  const fetcher: SourceFetcher = async <TResponse>(
    url: string,
    options?: { signal?: AbortSignal },
  ) => (await fetcherMock(url, options)) as TResponse;

  beforeEach(() => {
    fetcherMock.mockReset();
  });

  it("loads raw Pastebin content and maps one ready Source File", async () => {
    const signal = new AbortController().signal;
    fetcherMock.mockResolvedValueOnce("- [ ] pastebin task");

    const source = await pastebinService.load(
      { type: "pastebin", pasteId: "HdpnureE" },
      { fetcher, signal },
    );

    expect(fetcherMock).toHaveBeenCalledWith("https://pastebin.com/raw/HdpnureE", { signal });
    expect(source).toEqual({
      reference: { type: "pastebin", pasteId: "HdpnureE" },
      metadata: {
        title: "HdpnureE",
        url: "https://pastebin.com/HdpnureE",
      },
      files: [
        {
          status: "ready",
          id: "HdpnureE",
          name: "HdpnureE",
          content: "- [ ] pastebin task",
        },
      ],
    });
  });

  it("throws a source-level load error when raw Pastebin loading fails", async () => {
    fetcherMock.mockRejectedValueOnce(new Error("pastebin failed"));

    await expect(
      pastebinService.load({ type: "pastebin", pasteId: "HdpnureE" }, { fetcher }),
    ).rejects.toMatchObject({
      name: SourceLoadError.name,
      message: "Failed to load Pastebin source.",
    });
  });
});
