import { describe, expect, it, vi } from "vitest";

import type { LoadedSource, SourceReference } from "@/source-services/types";

import {
  useChecklistSourceReferenceLifecycle,
  type ChecklistSourceReferenceBrowser,
  type LoadChecklistSourceReference,
} from "./source-reference-lifecycle";
import type { ChecklistSession } from "../types";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve: Deferred<T>["resolve"] | undefined;
  let reject: Deferred<T>["reject"] | undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  if (resolve === undefined || reject === undefined) {
    throw new Error("Deferred promise was not initialized.");
  }

  return { promise, resolve, reject };
}

function createSource(title = "HdpnureE"): LoadedSource {
  return {
    reference: { type: "pastebin", pasteId: title },
    metadata: {
      title,
      url: `https://pastebin.com/${title}`,
    },
    files: [
      {
        status: "ready",
        id: title,
        name: title,
        content: "- [ ] First task",
      },
    ],
  };
}

function createSession(title = "HdpnureE"): ChecklistSession {
  return {
    source: createSource(title),
    files: [],
    hasTaskItems: false,
  };
}

function createBrowser(overrides: Partial<ChecklistSourceReferenceBrowser> = {}) {
  const stopHashListener = vi.fn<() => void>();
  const browser: ChecklistSourceReferenceBrowser = {
    getStateHash: vi.fn<() => string>(() => "#10"),
    listenToHash: vi.fn<ChecklistSourceReferenceBrowser["listenToHash"]>(() => stopHashListener),
    resetTitle: vi.fn<() => void>(),
    setTitle: vi.fn<(title: string) => void>(),
    ...overrides,
  };

  return { browser, stopHashListener };
}

describe("useChecklistSourceReferenceLifecycle", () => {
  it("opens a Source Reference as a ready Checklist lifecycle state", async () => {
    const { browser } = createBrowser();
    const load = vi.fn<LoadChecklistSourceReference>().mockResolvedValue({
      status: "loaded",
      session: createSession("Loaded source"),
      browserTitle: "Loaded source - Checkgist",
    });
    const lifecycle = useChecklistSourceReferenceLifecycle({ browser, load });
    const reference = { type: "pastebin", pasteId: "HdpnureE" } satisfies SourceReference;

    await lifecycle.open(reference);

    expect(load).toHaveBeenCalledWith(reference, {
      stateHash: "#10",
      signal: expect.any(AbortSignal),
    });
    expect(browser.setTitle).toHaveBeenCalledWith("Loaded source - Checkgist");
    expect(browser.listenToHash).toHaveBeenCalledTimes(1);
    expect(lifecycle.state.value.status).toBe("ready");
    expect(lifecycle.state.value.session?.source.metadata.title).toBe("Loaded source");
  });

  it("returns unsupported state and resets the browser title for invalid Source References", async () => {
    const { browser } = createBrowser();
    const load = vi.fn<LoadChecklistSourceReference>().mockResolvedValue({
      status: "unsupported",
      message: "Unsupported source URL.",
    });
    const lifecycle = useChecklistSourceReferenceLifecycle({ browser, load });

    await lifecycle.open(null);

    expect(browser.resetTitle).toHaveBeenCalledOnce();
    expect(browser.listenToHash).not.toHaveBeenCalled();
    expect(lifecycle.state.value).toEqual({
      status: "unsupported",
      session: null,
      message: "Unsupported source URL.",
    });
  });

  it("returns error state and resets the browser title for load failures", async () => {
    const { browser } = createBrowser();
    const load = vi
      .fn<LoadChecklistSourceReference>()
      .mockRejectedValue(new Error("Failed to load Pastebin source."));
    const lifecycle = useChecklistSourceReferenceLifecycle({ browser, load });

    await lifecycle.open({ type: "pastebin", pasteId: "HdpnureE" });

    expect(browser.resetTitle).toHaveBeenCalledOnce();
    expect(lifecycle.state.value).toEqual({
      status: "error",
      session: null,
      message: "Failed to load Pastebin source.",
    });
  });

  it("aborts the previous source load and ignores its stale resolved result", async () => {
    const { browser } = createBrowser();
    const firstLoad = createDeferred<Awaited<ReturnType<LoadChecklistSourceReference>>>();
    const secondLoad = createDeferred<Awaited<ReturnType<LoadChecklistSourceReference>>>();
    const load = vi.fn<LoadChecklistSourceReference>();
    load.mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise);
    const lifecycle = useChecklistSourceReferenceLifecycle({ browser, load });

    const firstOpen = lifecycle.open({ type: "pastebin", pasteId: "first" });
    const firstSignal = load.mock.calls[0]?.[1].signal;

    const secondOpen = lifecycle.open({ type: "pastebin", pasteId: "second" });
    expect(firstSignal?.aborted).toBe(true);

    secondLoad.resolve({
      status: "loaded",
      session: createSession("second"),
      browserTitle: "second - Checkgist",
    });
    await secondOpen;

    expect(lifecycle.state.value.status).toBe("ready");
    expect(lifecycle.state.value.session?.source.metadata.title).toBe("second");
    expect(browser.setTitle).toHaveBeenLastCalledWith("second - Checkgist");

    firstLoad.resolve({
      status: "loaded",
      session: createSession("first"),
      browserTitle: "first - Checkgist",
    });
    await firstOpen;

    expect(lifecycle.state.value.status).toBe("ready");
    expect(lifecycle.state.value.session?.source.metadata.title).toBe("second");
    expect(browser.setTitle).not.toHaveBeenCalledWith("first - Checkgist");
  });

  it("ignores stale rejected source load errors", async () => {
    const { browser } = createBrowser();
    const firstLoad = createDeferred<Awaited<ReturnType<LoadChecklistSourceReference>>>();
    const secondLoad = createDeferred<Awaited<ReturnType<LoadChecklistSourceReference>>>();
    const load = vi.fn<LoadChecklistSourceReference>();
    load.mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise);
    const lifecycle = useChecklistSourceReferenceLifecycle({ browser, load });

    const firstOpen = lifecycle.open({ type: "pastebin", pasteId: "first" });
    const secondOpen = lifecycle.open({ type: "pastebin", pasteId: "second" });

    firstLoad.reject(new Error("Stale load failed."));
    await firstOpen;

    expect(lifecycle.state.value.status).toBe("loading");
    expect(browser.resetTitle).not.toHaveBeenCalled();

    secondLoad.resolve({
      status: "loaded",
      session: createSession("second"),
      browserTitle: "second - Checkgist",
    });
    await secondOpen;

    expect(lifecycle.state.value.status).toBe("ready");
    expect(lifecycle.state.value.session?.source.metadata.title).toBe("second");
  });

  it("stops the current hash listener when opening another Source Reference", async () => {
    const firstStopHashListener = vi.fn<() => void>();
    const secondStopHashListener = vi.fn<() => void>();
    const listenToHash = vi.fn<ChecklistSourceReferenceBrowser["listenToHash"]>();
    listenToHash
      .mockReturnValueOnce(firstStopHashListener)
      .mockReturnValueOnce(secondStopHashListener);
    const { browser } = createBrowser({
      listenToHash,
    });
    const load = vi.fn<LoadChecklistSourceReference>();
    load
      .mockResolvedValueOnce({
        status: "loaded",
        session: createSession("first"),
        browserTitle: "first - Checkgist",
      })
      .mockResolvedValueOnce({
        status: "loaded",
        session: createSession("second"),
        browserTitle: "second - Checkgist",
      });
    const lifecycle = useChecklistSourceReferenceLifecycle({ browser, load });

    await lifecycle.open({ type: "pastebin", pasteId: "first" });
    await lifecycle.open({ type: "pastebin", pasteId: "second" });

    expect(firstStopHashListener).toHaveBeenCalledOnce();
    expect(secondStopHashListener).not.toHaveBeenCalled();
  });

  it("aborts the active load and stops listening to hash changes on dispose", async () => {
    const { browser, stopHashListener } = createBrowser();
    const load = vi.fn<LoadChecklistSourceReference>().mockResolvedValue({
      status: "loaded",
      session: createSession("Loaded source"),
      browserTitle: "Loaded source - Checkgist",
    });
    const lifecycle = useChecklistSourceReferenceLifecycle({ browser, load });

    await lifecycle.open({ type: "pastebin", pasteId: "HdpnureE" });
    const signal = load.mock.calls[0]?.[1].signal;
    lifecycle.dispose();

    expect(signal?.aborted).toBe(true);
    expect(stopHashListener).toHaveBeenCalledOnce();
  });
});
