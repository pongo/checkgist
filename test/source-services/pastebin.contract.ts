import { describe, expect, it } from "vitest";

import { directSourceFetcher } from "@/source-services/fetcher";
import { pastebinService } from "@/source-services/pastebin";

describe("pastebinService live contract", () => {
  it("loads a known public paste through direct server-side fetching", async () => {
    const pasteId = "HdpnureE";

    const source = await pastebinService.load(
      { type: "pastebin", pasteId },
      { fetcher: directSourceFetcher },
    );

    expect(source.reference).toEqual({ type: "pastebin", pasteId });
    expect(source.metadata.url).toBe(`https://pastebin.com/${pasteId}`);
    expect(source.files).toHaveLength(1);
    expect(source.files[0]).toMatchObject({
      status: "ready",
      id: pasteId,
      name: pasteId,
    });
    expect(
      source.files[0]?.status === "ready" ? source.files[0].content.length : 0,
    ).toBeGreaterThan(0);
  }, 30_000);
});
