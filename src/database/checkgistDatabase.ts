import { type DBSchema, type IDBPDatabase, openDB } from "idb";

const databaseName = "checkgist";
const databaseVersion = 1;

/** The object-store name for user-managed Bookmarks. */
export const bookmarksStoreName = "bookmarks";

/** The Bookmark index that preserves the user-managed list order. */
export const bookmarksByPositionIndexName = "by-position";

/** A persisted Bookmark record. */
export type Bookmark = {
  routePath: string;
  title: string;
  position: number;
};

/** The typed schema shared by all Checkgist IndexedDB feature boundaries. */
export interface CheckgistDatabase extends DBSchema {
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: {
      "by-position": number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CheckgistDatabase>> | null = null;

/**
 * Opens the shared Checkgist IndexedDB connection.
 *
 * The connection is cached only while its schema version is current. Closing it
 * on `versionchange` lets a future schema migration complete without an idle
 * application tab blocking the upgrade.
 */
export function openCheckgistDatabase(): Promise<IDBPDatabase<CheckgistDatabase>> {
  if (dbPromise !== null) {
    return dbPromise;
  }

  let database: IDBPDatabase<CheckgistDatabase> | null = null;
  const openingPromise = openDB<CheckgistDatabase>(databaseName, databaseVersion, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(bookmarksStoreName)) {
        const store = db.createObjectStore(bookmarksStoreName, {
          keyPath: "routePath",
        });
        store.createIndex(bookmarksByPositionIndexName, "position");
      }
    },
    blocking() {
      database?.close();
      database = null;

      if (dbPromise === sharedPromise) {
        dbPromise = null;
      }
    },
    terminated() {
      database = null;

      if (dbPromise === sharedPromise) {
        dbPromise = null;
      }
    },
  });

  const sharedPromise = openingPromise.then((openedDatabase) => {
    database = openedDatabase;
    return openedDatabase;
  });
  dbPromise = sharedPromise;

  void sharedPromise.catch(() => {
    if (dbPromise === sharedPromise) {
      dbPromise = null;
    }
  });

  return sharedPromise;
}

/** Closes the cached connection so IndexedDB tests can install a fresh factory. */
export async function closeCheckgistDatabaseForTests(): Promise<void> {
  const currentPromise = dbPromise;
  dbPromise = null;

  if (currentPromise !== null) {
    const database = await currentPromise;
    database.close();
  }
}
