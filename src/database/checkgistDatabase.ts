import { type DBSchema, type IDBPDatabase, openDB } from "idb";

const databaseName = "checkgist";
const databaseVersion = 2;

/** The object-store name for user-managed Bookmarks. */
export const bookmarksStoreName = "bookmarks";

/** The Bookmark index that preserves the user-managed list order. */
export const bookmarksByPositionIndexName = "by-position";

/** The object-store name for application-owned Local Documents. */
export const localDocumentsStoreName = "local-documents";

/** The Local Document index used to order the home-page list by latest save. */
export const localDocumentsByUpdatedAtIndexName = "by-updated-at";

/** A persisted Bookmark record. */
export type Bookmark = {
  routePath: string;
  title: string;
  position: number;
};

/** A persisted Markdown document owned by Checkgist. */
export type LocalDocumentRecord = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
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
  "local-documents": {
    key: string;
    value: LocalDocumentRecord;
    indexes: {
      "by-updated-at": number;
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
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(bookmarksStoreName, {
          keyPath: "routePath",
        });
        store.createIndex(bookmarksByPositionIndexName, "position");
      }

      // Stryker disable next-line EqualityOperator,ConditionalExpression: IndexedDB invokes upgrade only when the existing version is lower than the requested version (2).
      if (oldVersion < 2) {
        // The v1 Bookmark store remains untouched, preserving existing records.
        const store = db.createObjectStore(localDocumentsStoreName, { keyPath: "id" });
        store.createIndex(localDocumentsByUpdatedAtIndexName, "updatedAt");
      }
    },
    blocking() {
      database?.close();
      database = null;

      // Stryker disable next-line ConditionalExpression: The blocking event is dispatched synchronously, so a newer cached promise cannot be installed before this listener returns.
      if (dbPromise === sharedPromise) {
        dbPromise = null;
      }
    },
    terminated() {
      database = null;

      // Stryker disable next-line ConditionalExpression: The terminated event is dispatched synchronously, so a newer cached promise cannot be installed before this listener returns.
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
    // Stryker disable next-line ConditionalExpression: A failed open cannot install a database connection, and this catch is the only production path that clears its cached promise.
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
