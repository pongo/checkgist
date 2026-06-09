import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addBookmark,
  closeBookmarkDatabaseForTests,
  listBookmarks,
  removeBookmark,
  renameBookmark,
  reorderBookmark,
  restoreBookmark,
} from "./db";

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

describe("bookmark database", () => {
  beforeEach(async () => {
    await closeBookmarkDatabaseForTests();
    resetIndexedDb();
  });

  it("adds bookmarks to the end of the list", async () => {
    await addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await addBookmark({ routePath: "/pastebin.com/two", title: "Two" });

    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
    ]);
  });

  it("keeps an existing bookmark when adding the same route again", async () => {
    await addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await addBookmark({ routePath: "/pastebin.com/one", title: "Updated" });

    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
    ]);
  });

  it("renames a bookmark without changing its position", async () => {
    await addBookmark({ routePath: "/pastebin.com/one", title: "One" });

    await renameBookmark("/pastebin.com/one", "Release checklist");

    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/one", title: "Release checklist", position: 0 },
    ]);
  });

  it("removes a bookmark and normalizes remaining positions", async () => {
    await addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    await addBookmark({ routePath: "/pastebin.com/three", title: "Three" });

    const removed = await removeBookmark("/pastebin.com/two");

    expect(removed).toEqual({ routePath: "/pastebin.com/two", title: "Two", position: 1 });
    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/three", title: "Three", position: 1 },
    ]);
  });

  it("reorders bookmarks with dense positions", async () => {
    await addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    await addBookmark({ routePath: "/pastebin.com/three", title: "Three" });

    await reorderBookmark("/pastebin.com/three", 0);

    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/three", title: "Three", position: 0 },
      { routePath: "/pastebin.com/one", title: "One", position: 1 },
      { routePath: "/pastebin.com/two", title: "Two", position: 2 },
    ]);
  });

  it("restores a bookmark at the requested position", async () => {
    await addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    await addBookmark({ routePath: "/pastebin.com/three", title: "Three" });
    const removed = await removeBookmark("/pastebin.com/two");

    if (removed === null) {
      throw new Error("Expected bookmark to be removed.");
    }

    await restoreBookmark(removed, 1);

    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
      { routePath: "/pastebin.com/three", title: "Three", position: 2 },
    ]);
  });
});
