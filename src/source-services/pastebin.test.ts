import { ofetch } from "ofetch";
import type { $Fetch } from "ofetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pastebinService } from "./pastebin";
import { SourceLoadError } from "./types";

const ofetchMock = vi.hoisted(() => vi.fn<$Fetch>());

vi.mock("ofetch", () => ({
  ofetch: ofetchMock,
}));

const mockedOfetch = vi.mocked(ofetch);

describe("pastebinService.load", () => {
  beforeEach(() => {
    mockedOfetch.mockReset();
  });

  it("loads raw Pastebin content and maps one ready Source File", async () => {
    const signal = new AbortController().signal;
    mockedOfetch.mockResolvedValueOnce("- [ ] pastebin task");

    const source = await pastebinService.load(
      { type: "pastebin", pasteId: "HdpnureE" },
      { signal },
    );

    expect(mockedOfetch).toHaveBeenCalledWith("https://pastebin.com/raw/HdpnureE", { signal });
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
    mockedOfetch.mockRejectedValueOnce(new Error("pastebin failed"));

    await expect(
      pastebinService.load({ type: "pastebin", pasteId: "HdpnureE" }),
    ).rejects.toMatchObject({
      name: SourceLoadError.name,
      message: "Failed to load Pastebin source.",
    });
  });
});
