import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { effectScope } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";

import {
  addBookmark as addBookmarkToDatabase,
  listBookmarks as listBookmarksFromDatabase,
} from "./db";
import type { Bookmark } from "./db";
import { useBookmarks } from "./useBookmarks";

const requestPersistentStorageOnce = vi.hoisted(() => vi.fn<() => void>());
const listBookmarks = vi.hoisted(() => vi.fn<() => Promise<Bookmark[]>>());

vi.mock("@/shared/persistent-storage", () => ({
  requestPersistentStorageOnce,
}));

vi.mock("./db", async (importOriginal) => {
  const database = await importOriginal<typeof import("./db")>();
  listBookmarks.mockImplementation(database.listBookmarks);
  return { ...database, listBookmarks };
});

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

describe("useBookmarks", () => {
  beforeEach(async () => {
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();
    requestPersistentStorageOnce.mockReset();
    listBookmarks.mockClear();
  });

  it("loads a fresh persisted snapshot for each composable instance", async () => {
    await addBookmarkToDatabase({ routePath: "/pastebin.com/one", title: "One" });
    const first = useBookmarks();
    await first.ensureLoaded();

    await addBookmarkToDatabase({ routePath: "/pastebin.com/two", title: "Two" });
    const second = useBookmarks();
    await second.ensureLoaded();

    expect(first.bookmarks.value).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
    ]);
    expect(second.bookmarks.value).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
    ]);
  });

  it("refreshes active Vue scopes after a same-tab mutation", async () => {
    const scope = effectScope();
    const activeBookmarks = scope.run(() => useBookmarks());

    if (activeBookmarks === undefined) throw new Error("Expected an active Bookmark scope.");

    await activeBookmarks.ensureLoaded();
    await useBookmarks().addBookmark({ routePath: "/pastebin.com/one", title: "One" });

    await vi.waitFor(() => {
      expect(activeBookmarks.bookmarks.value).toEqual([
        { routePath: "/pastebin.com/one", title: "One", position: 0 },
      ]);
    });

    scope.stop();
  });

  it("clears its snapshot and reloads current persisted Bookmarks when invalidated", async () => {
    await addBookmarkToDatabase({ routePath: "/pastebin.com/one", title: "One" });
    const bookmarks = useBookmarks();
    await bookmarks.ensureLoaded();

    await addBookmarkToDatabase({ routePath: "/pastebin.com/two", title: "Two" });
    bookmarks.invalidate();

    expect(bookmarks.bookmarks.value).toEqual([]);
    expect(bookmarks.status.value).toBe("loading");

    await bookmarks.ensureLoaded();

    expect(bookmarks.bookmarks.value).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
    ]);
  });

  it("reports an error when an active scope cannot refresh after another scope changes Bookmarks", async () => {
    const scope = effectScope();
    const activeBookmarks = scope.run(() => useBookmarks());

    if (activeBookmarks === undefined) throw new Error("Expected an active Bookmark scope.");

    await activeBookmarks.ensureLoaded();
    const sourceBookmarks = useBookmarks();
    await sourceBookmarks.ensureLoaded();
    const listError = new Error("Unable to refresh Bookmarks");
    listBookmarks.mockRejectedValueOnce(listError);

    try {
      await sourceBookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });

      await vi.waitFor(() => {
        expect(activeBookmarks.status.value).toBe("error");
        expect(activeBookmarks.error.value).toBe(listError);
      });
    } finally {
      scope.stop();
    }
  });

  it("ignores a stale active-scope refresh error after invalidation loads a newer snapshot", async () => {
    const scope = effectScope();
    const activeBookmarks = scope.run(() => useBookmarks());

    if (activeBookmarks === undefined) throw new Error("Expected an active Bookmark scope.");

    await activeBookmarks.ensureLoaded();
    const sourceBookmarks = useBookmarks();
    await sourceBookmarks.ensureLoaded();

    let rejectStaleRefresh: (reason?: unknown) => void = () => undefined;
    const staleRefresh = new Promise<Bookmark[]>((_, reject) => {
      rejectStaleRefresh = reject;
    });
    listBookmarks.mockImplementationOnce(() => staleRefresh);

    try {
      await sourceBookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
      activeBookmarks.invalidate();
      await activeBookmarks.ensureLoaded();
      rejectStaleRefresh(new Error("Stale refresh failed"));
      await new Promise((resolve) => setTimeout(resolve));

      expect(activeBookmarks.status.value).toBe("ready");
      expect(activeBookmarks.error.value).toBeNull();
    } finally {
      scope.stop();
    }
  });

  it("keeps the newer snapshot while an invalidated load is still pending", async () => {
    let resolveStaleLoad: (bookmarks: Bookmark[]) => void = () => undefined;
    let resolveCurrentLoad: (bookmarks: Bookmark[]) => void = () => undefined;
    const staleLoad = new Promise<Bookmark[]>((resolve) => {
      resolveStaleLoad = resolve;
    });
    const currentLoad = new Promise<Bookmark[]>((resolve) => {
      resolveCurrentLoad = resolve;
    });
    listBookmarks.mockImplementationOnce(() => staleLoad).mockImplementationOnce(() => currentLoad);

    const bookmarks = useBookmarks();
    bookmarks.invalidate();
    resolveStaleLoad([{ routePath: "/pastebin.com/stale", title: "Stale", position: 0 }]);
    await vi.waitFor(() => expect(listBookmarks).toHaveBeenCalledTimes(2));

    expect(bookmarks.status.value).toBe("loading");
    expect(bookmarks.bookmarks.value).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve));
    void bookmarks.ensureLoaded();
    expect(listBookmarks).toHaveBeenCalledTimes(2);

    resolveCurrentLoad([{ routePath: "/pastebin.com/current", title: "Current", position: 0 }]);
    await bookmarks.ensureLoaded();

    expect(bookmarks.bookmarks.value).toEqual([
      { routePath: "/pastebin.com/current", title: "Current", position: 0 },
    ]);
  });

  it("ignores an invalidated load error after the current snapshot is ready", async () => {
    let rejectStaleLoad: (reason?: unknown) => void = () => undefined;
    const staleLoad = new Promise<Bookmark[]>((_, reject) => {
      rejectStaleLoad = reject;
    });
    listBookmarks.mockImplementationOnce(() => staleLoad);

    const bookmarks = useBookmarks();
    bookmarks.invalidate();
    await bookmarks.ensureLoaded();
    rejectStaleLoad(new Error("Stale load failed"));
    await new Promise((resolve) => setTimeout(resolve));

    expect(bookmarks.status.value).toBe("ready");
    expect(bookmarks.error.value).toBeNull();
  });

  it("retries an initial load after it fails", async () => {
    listBookmarks.mockRejectedValueOnce(new Error("Initial load failed"));
    const bookmarks = useBookmarks();

    await bookmarks.ensureLoaded();
    expect(bookmarks.status.value).toBe("error");

    await bookmarks.ensureLoaded();

    expect(bookmarks.status.value).toBe("ready");
  });

  it("does not change other Bookmarks when renaming one", async () => {
    await addBookmarkToDatabase({ routePath: "/pastebin.com/one", title: "One" });
    await addBookmarkToDatabase({ routePath: "/pastebin.com/two", title: "Two" });
    const bookmarks = useBookmarks();
    await bookmarks.ensureLoaded();

    await bookmarks.renameBookmark("/pastebin.com/one", "Renamed");

    expect(bookmarks.bookmarks.value).toEqual([
      { routePath: "/pastebin.com/one", title: "Renamed", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
    ]);
  });

  it("does not issue Bookmark commands while the persisted snapshot is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const bookmarks = useBookmarks();

    await bookmarks.ensureLoaded();
    await expect(
      bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" }),
    ).resolves.toBeNull();
    await expect(bookmarks.removeBookmark("/pastebin.com/one")).resolves.toBeNull();
    await expect(bookmarks.renameBookmark("/pastebin.com/one", "Renamed")).resolves.toBeNull();
    await expect(bookmarks.reorderBookmark("/pastebin.com/one", 0)).resolves.toBeUndefined();
    await expect(
      bookmarks.restoreBookmark({ routePath: "/pastebin.com/one", title: "One", position: 0 }, 0),
    ).resolves.toBeUndefined();
  });

  it("does not refresh other scopes after removing a missing Bookmark", async () => {
    const scope = effectScope();
    const activeBookmarks = scope.run(() => useBookmarks());

    if (activeBookmarks === undefined) throw new Error("Expected an active Bookmark scope.");

    await activeBookmarks.ensureLoaded();
    const sourceBookmarks = useBookmarks();
    await sourceBookmarks.ensureLoaded();
    const refreshError = new Error("Source refresh failed");
    listBookmarks.mockRejectedValueOnce(refreshError);

    try {
      await expect(sourceBookmarks.removeBookmark("/pastebin.com/missing")).rejects.toBe(
        refreshError,
      );
      await new Promise((resolve) => setTimeout(resolve));

      expect(activeBookmarks.status.value).toBe("ready");
      expect(activeBookmarks.error.value).toBeNull();
    } finally {
      scope.stop();
    }
  });

  it("refreshes active scopes after removing a Bookmark", async () => {
    await addBookmarkToDatabase({ routePath: "/pastebin.com/one", title: "One" });
    const scope = effectScope();
    const activeBookmarks = scope.run(() => useBookmarks());

    if (activeBookmarks === undefined) throw new Error("Expected an active Bookmark scope.");

    try {
      await activeBookmarks.ensureLoaded();
      const sourceBookmarks = useBookmarks();
      await sourceBookmarks.ensureLoaded();

      await sourceBookmarks.removeBookmark("/pastebin.com/one");

      await vi.waitFor(() => expect(activeBookmarks.bookmarks.value).toEqual([]));
    } finally {
      scope.stop();
    }
  });

  it("resets the cached database before a test installs another IndexedDB factory", async () => {
    await addBookmarkToDatabase({ routePath: "/pastebin.com/one", title: "One" });

    await closeCheckgistDatabaseForTests();
    resetIndexedDb();

    expect(await listBookmarksFromDatabase()).toEqual([]);
  });

  it("requests persistent storage once after successful new bookmark adds", async () => {
    const bookmarks = useBookmarks();

    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "Duplicate" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });

    expect(requestPersistentStorageOnce).toHaveBeenCalledTimes(2);
  });

  it("requests persistent storage for a new Bookmark beside an existing one", async () => {
    const bookmarks = useBookmarks();

    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    requestPersistentStorageOnce.mockClear();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });

    expect(requestPersistentStorageOnce).toHaveBeenCalledTimes(1);
  });

  it("does not reload the scope that applied its own Bookmark change", async () => {
    const scope = effectScope();
    const bookmarks = scope.run(() => useBookmarks());

    if (bookmarks === undefined) throw new Error("Expected an active Bookmark scope.");

    try {
      await bookmarks.ensureLoaded();
      listBookmarks.mockClear();

      await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });

      expect(listBookmarks).toHaveBeenCalledTimes(1);
    } finally {
      scope.stop();
    }
  });

  it("enters error status when IndexedDB cannot load", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const bookmarks = useBookmarks();

    await bookmarks.ensureLoaded();

    expect(bookmarks.status.value).toBe("error");
    expect(bookmarks.error.value).toBeInstanceOf(Error);
    expect(bookmarks.isReady.value).toBe(false);
  });
});
