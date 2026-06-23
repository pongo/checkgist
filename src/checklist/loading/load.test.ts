import { describe, expect, it, vi } from "vitest";

import { createSourceRegistry, unsupportedSourceUrlMessage } from "@/source-services/registry";
import type { LoadedSource, SourceReference, SourceService } from "@/source-services/types";

import { loadChecklist } from "./load";

type PastebinReference = { type: "pastebin"; pasteId: string };
type LoadPastebinSource = SourceService<PastebinReference>["load"];

function createSource(overrides: Partial<LoadedSource> = {}): LoadedSource {
  return {
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
        content: "- [ ] First task",
      },
    ],
    ...overrides,
  };
}

function createPastebinService(load: LoadPastebinSource): SourceService<PastebinReference> {
  return {
    type: "pastebin",
    fromUrl: () => null,
    fromRoute: () => null,
    toRoute: (reference) => ["pastebin.com", reference.pasteId],
    load,
  };
}

function createLoadSourceMock() {
  return vi.fn<LoadPastebinSource>();
}

describe("loadChecklist", () => {
  it("loads Source Content, builds a Checklist, and returns browser metadata", async () => {
    const signal = new AbortController().signal;
    const load = createLoadSourceMock().mockResolvedValue(
      createSource({
        metadata: {
          title: "Loaded source",
          url: "https://pastebin.com/HdpnureE",
        },
      }),
    );
    const registry = createSourceRegistry([createPastebinService(load)]);

    const result = await loadChecklist(
      { type: "pastebin", pasteId: "HdpnureE" },
      {
        registry,
        stateHash: "#1",
        signal,
      },
    );

    expect(load).toHaveBeenCalledWith({ type: "pastebin", pasteId: "HdpnureE" }, { signal });
    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") {
      return;
    }

    expect(result.browserTitle).toBe("Loaded source - Checkgist");
    expect(result.session.source.metadata.title).toBe("Loaded source");
    const file = result.session.files[0];
    expect(file?.status).toBe("ready");
    if (file?.status !== "ready") {
      return;
    }
    expect(file.checked).toEqual([true]);
  });

  it("returns an unsupported result for a missing Source Reference", async () => {
    const registry = createSourceRegistry([createPastebinService(createLoadSourceMock())]);

    await expect(loadChecklist(null, { registry })).resolves.toEqual({
      status: "unsupported",
      message: unsupportedSourceUrlMessage,
    });
  });

  it("returns an unsupported result when no Source Service matches the reference type", async () => {
    const registry = createSourceRegistry([]);

    await expect(
      loadChecklist({ type: "pastebin", pasteId: "HdpnureE" }, { registry }),
    ).resolves.toEqual({
      status: "unsupported",
      message: unsupportedSourceUrlMessage,
    });
  });

  it("propagates source-level load errors", async () => {
    const error = new Error("Failed to load Pastebin source.");
    const registry = createSourceRegistry([
      createPastebinService(createLoadSourceMock().mockRejectedValue(error)),
    ]);

    await expect(
      loadChecklist({ type: "pastebin", pasteId: "HdpnureE" }, { registry }),
    ).rejects.toBe(error);
  });

  it("accepts unknown Source Reference shapes defensively at runtime", async () => {
    const registry = createSourceRegistry([createPastebinService(createLoadSourceMock())]);

    await expect(
      loadChecklist({ type: "unknown" } as unknown as SourceReference, { registry }),
    ).resolves.toEqual({
      status: "unsupported",
      message: unsupportedSourceUrlMessage,
    });
  });
});
