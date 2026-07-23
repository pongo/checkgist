import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bookmarksByPositionIndexName,
  bookmarksStoreName,
  closeCheckgistDatabaseForTests,
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

  it("closes its connection when a later schema version is opened", async () => {
    await openCheckgistDatabase();

    const upgradedDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("checkgist", 2);
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });

    expect(upgradedDatabase.version).toBe(2);
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
