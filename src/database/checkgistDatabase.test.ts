import "fake-indexeddb/auto";

import { forceCloseDatabase, IDBFactory } from "fake-indexeddb";
import { unwrap } from "idb";
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

  it("opens a fresh connection after the browser terminates the current one", async () => {
    const terminatedDatabase = await openCheckgistDatabase();
    await terminatedDatabase.put(bookmarksStoreName, {
      routePath: "/pastebin.com/terminated",
      title: "Terminated bookmark",
      position: 0,
    });

    // fake-indexeddb declares this parameter as a constructor, but its API accepts a database instance.
    forceCloseDatabase(
      unwrap(terminatedDatabase) as unknown as Parameters<typeof forceCloseDatabase>[0],
    );
    resetIndexedDb();

    const reopenedDatabase = await openCheckgistDatabase();

    expect(
      await reopenedDatabase.get(bookmarksStoreName, "/pastebin.com/terminated"),
    ).toBeUndefined();
    terminatedDatabase.close();
  });

  it("recovers from an unsuccessful database open", async () => {
    const newerDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("checkgist", 3);
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    newerDatabase.close();

    await expect(openCheckgistDatabase()).rejects.toThrow(/version/i);
    resetIndexedDb();

    const database = await openCheckgistDatabase();

    expect(database.objectStoreNames.contains(bookmarksStoreName)).toBe(true);
  });

  it("opens against a fresh IndexedDB factory after the test seam closes the connection", async () => {
    await openCheckgistDatabase();
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();

    const database = await openCheckgistDatabase();

    expect(database.objectStoreNames.contains(bookmarksStoreName)).toBe(true);
  });
});
