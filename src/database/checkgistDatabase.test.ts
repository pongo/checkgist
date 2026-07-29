import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bookmarksByPositionIndexName,
  bookmarksStoreName,
  closeCheckgistDatabaseForTests,
  localDocumentsByUpdatedAtIndexName,
  localDocumentsStoreName,
  openCheckgistDatabase,
} from "./checkgistDatabase";

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

describe("Checkgist database lifecycle", () => {
  beforeEach(async () => {
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();
  });

  it("creates the Bookmark store and its ordering index", async () => {
    const database = await openCheckgistDatabase();

    expect(database.objectStoreNames.contains(bookmarksStoreName)).toBe(true);
    expect(
      database
        .transaction(bookmarksStoreName)
        .store.indexNames.contains(bookmarksByPositionIndexName),
    ).toBe(true);
  });

  it("preserves version-1 Bookmark records while adding the Local Document store", async () => {
    const legacyDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("checkgist", 1);
      request.addEventListener("upgradeneeded", () => {
        const store = request.result.createObjectStore(bookmarksStoreName, {
          keyPath: "routePath",
        });
        store.createIndex(bookmarksByPositionIndexName, "position");
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    legacyDatabase
      .transaction(bookmarksStoreName, "readwrite")
      .objectStore(bookmarksStoreName)
      .put({ routePath: "/pastebin.com/legacy", title: "Legacy bookmark", position: 0 });
    legacyDatabase.close();

    const database = await openCheckgistDatabase();

    expect(await database.get(bookmarksStoreName, "/pastebin.com/legacy")).toEqual({
      routePath: "/pastebin.com/legacy",
      title: "Legacy bookmark",
      position: 0,
    });
    expect(database.objectStoreNames.contains(localDocumentsStoreName)).toBe(true);
    expect(
      database
        .transaction(localDocumentsStoreName)
        .store.indexNames.contains(localDocumentsByUpdatedAtIndexName),
    ).toBe(true);
  });

  it("closes its connection when a later schema version is opened", async () => {
    await openCheckgistDatabase();

    const upgradedDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("checkgist", 3);
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });

    expect(upgradedDatabase.version).toBe(3);
    upgradedDatabase.close();
  });

  it("opens against a fresh IndexedDB factory after the test seam closes the connection", async () => {
    await openCheckgistDatabase();
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();

    const database = await openCheckgistDatabase();

    expect(database.objectStoreNames.contains(bookmarksStoreName)).toBe(true);
  });
});
