import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { effectScope } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addBookmark as addBookmarkToDatabase, closeBookmarkDatabaseForTests } from "./db";
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
