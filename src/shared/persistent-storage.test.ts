import { afterEach, describe, expect, it, vi } from "vitest";

async function loadPersistentStorage() {
  vi.resetModules();
  return import("./persistent-storage");
}

describe("requestPersistentStorageOnce", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests persistent storage when it is not already persistent", async () => {
    const persisted = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const persist = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    vi.stubGlobal("navigator", { storage: { persisted, persist } });
    const { requestPersistentStorageOnce } = await loadPersistentStorage();

    requestPersistentStorageOnce();

    await vi.waitFor(() => {
      expect(persisted).toHaveBeenCalledTimes(1);
      expect(persist).toHaveBeenCalledTimes(1);
    });
  });

  it("does not request persistent storage again after the first attempt", async () => {
    const persisted = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const persist = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    vi.stubGlobal("navigator", { storage: { persisted, persist } });
    const { requestPersistentStorageOnce } = await loadPersistentStorage();

    requestPersistentStorageOnce();
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    requestPersistentStorageOnce();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
