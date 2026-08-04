import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { type DBSchema, openDB } from "idb";
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

interface LegacyBookmarkDatabase extends DBSchema {
  bookmarks: {
    key: string;
    value: {
      routePath: string;
      title: string;
      position: number;
    };
    indexes: {
      "by-position": number;
    };
  };
}

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

  it("reads Bookmark records created before database lifecycle centralization", async () => {
    const legacyDatabase = await openDB<LegacyBookmarkDatabase>("checkgist", 1, {
      upgrade(database) {
        const store = database.createObjectStore("bookmarks", {
          keyPath: "routePath",
        });
        store.createIndex("by-position", "position");
      },
    });
    await legacyDatabase.put("bookmarks", {
      routePath: "/pastebin.com/legacy",
      title: "Legacy bookmark",
      position: 0,
    });
    legacyDatabase.close();

    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/legacy", title: "Legacy bookmark", position: 0 },
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

  it("leaves bookmarks unchanged when reordering a missing bookmark", async () => {
    await addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await addBookmark({ routePath: "/pastebin.com/two", title: "Two" });

    const reordered = await reorderBookmark("/pastebin.com/missing", 0);

    const expected = [
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
    ];
    expect(reordered).toEqual(expected);
    expect(await listBookmarks()).toEqual(expected);
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
