import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { closeBookmarkDatabaseForTests } from "./db";
import { resetBookmarksForTests, useBookmarks } from "./useBookmarks";

const requestPersistentStorageOnce = vi.hoisted(() => vi.fn<() => void>());

vi.mock("@/shared/persistent-storage", () => ({
  requestPersistentStorageOnce,
}));

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

describe("useBookmarks", () => {
  beforeEach(async () => {
    await resetBookmarksForTests();
    await closeBookmarkDatabaseForTests();
    resetIndexedDb();
    requestPersistentStorageOnce.mockReset();
  });

  it("loads bookmarks into a shared cache", async () => {
    const first = useBookmarks();
    const second = useBookmarks();

    await first.ensureLoaded();
    await first.addBookmark({ routePath: "/pastebin.com/one", title: "One" });

    expect(second.isReady.value).toBe(true);
    expect(second.bookmarks.value).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
    ]);
  });

  it("requests persistent storage once after successful new bookmark adds", async () => {
    const bookmarks = useBookmarks();

    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "Duplicate" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });

    expect(requestPersistentStorageOnce).toHaveBeenCalledTimes(2);
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
