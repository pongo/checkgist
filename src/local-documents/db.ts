import {
  bookmarksStoreName,
  localDocumentsByUpdatedAtIndexName,
  localDocumentsStoreName,
  openCheckgistDatabase,
  type LocalDocumentRecord,
} from "@/database/checkgistDatabase";

import { isLocalDocumentId, validateLocalDocumentTitle, type LocalDocument } from "./types";

export type { LocalDocument } from "./types";

function orderedDocuments(documents: LocalDocument[]): LocalDocument[] {
  return [...documents].sort((first, second) => {
    const updatedAtDifference = second.updatedAt - first.updatedAt;
    return updatedAtDifference === 0 ? first.id.localeCompare(second.id) : updatedAtDifference;
  });
}

function orderedBookmarks<T extends { position: number; routePath: string }>(bookmarks: T[]): T[] {
  return [...bookmarks].sort((first, second) => {
    const positionDifference = first.position - second.position;
    return positionDifference === 0
      ? first.routePath.localeCompare(second.routePath)
      : positionDifference;
  });
}

function documentRoutePath(documentId: string): string {
  return `/local/${documentId}`;
}

/** Creates and commits the initial empty Local Document before an editor opens it. */
export async function createLocalDocument(
  documentId = crypto.randomUUID(),
): Promise<LocalDocument> {
  if (!isLocalDocumentId(documentId)) {
    throw new Error("Local Document IDs must be UUIDs.");
  }

  const timestamp = Date.now();
  const document: LocalDocument = {
    id: documentId,
    title: "Untitled document",
    content: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const db = await openCheckgistDatabase();
  await db.add(localDocumentsStoreName, document);
  return document;
}

/** Returns a Local Document by its stable ID, or null when it no longer exists. */
export async function getLocalDocument(documentId: string): Promise<LocalDocument | null> {
  if (!isLocalDocumentId(documentId)) {
    return null;
  }
  const db = await openCheckgistDatabase();
  return (await db.get(localDocumentsStoreName, documentId)) ?? null;
}

/** Lists Local Documents in deterministic last-successful-save order. */
export async function listLocalDocuments(): Promise<LocalDocument[]> {
  const db = await openCheckgistDatabase();
  const documents = await db.getAllFromIndex(
    localDocumentsStoreName,
    localDocumentsByUpdatedAtIndexName,
  );
  return orderedDocuments(documents);
}

/**
 * Persists a complete Local Document draft with last-write-wins semantics.
 * The title is normalized while Markdown content is retained byte-for-byte.
 */
export async function saveLocalDocument(input: {
  id: string;
  title: string;
  content: string;
}): Promise<LocalDocument | null> {
  const title = validateLocalDocumentTitle(input.title);
  if (!title.valid) {
    throw new Error(title.message);
  }

  if (!isLocalDocumentId(input.id)) {
    return null;
  }

  const db = await openCheckgistDatabase();
  const tx = db.transaction(localDocumentsStoreName, "readwrite");
  const existing = await tx.store.get(input.id);
  if (existing === undefined) {
    await tx.done;
    return null;
  }

  const saved: LocalDocumentRecord = {
    ...existing,
    title: title.title,
    content: input.content,
    updatedAt: Date.now(),
  };
  await Promise.all([tx.store.put(saved), tx.done]);
  return saved;
}

/**
 * Removes a Local Document and its matching Bookmark in one committed transaction.
 * Bookmark cache consumers must refresh only after this promise resolves.
 */
export async function deleteLocalDocument(documentId: string): Promise<LocalDocument | null> {
  if (!isLocalDocumentId(documentId)) {
    return null;
  }

  const db = await openCheckgistDatabase();
  const tx = db.transaction([localDocumentsStoreName, bookmarksStoreName], "readwrite");
  const documents = tx.objectStore(localDocumentsStoreName);
  const bookmarks = tx.objectStore(bookmarksStoreName);
  const document = await documents.get(documentId);
  if (document === undefined) {
    await tx.done;
    return null;
  }

  const removedBookmarkRoutePath = documentRoutePath(documentId);
  const remainingBookmarks = orderedBookmarks(await bookmarks.getAll()).filter(
    (bookmark) => bookmark.routePath !== removedBookmarkRoutePath,
  );
  const normalizedBookmarks = remainingBookmarks.map((bookmark, position) => ({
    ...bookmark,
    position,
  }));

  await Promise.all([
    documents.delete(documentId),
    bookmarks.delete(removedBookmarkRoutePath),
    ...normalizedBookmarks.map((bookmark) => bookmarks.put(bookmark)),
    tx.done,
  ]);
  return document;
}
