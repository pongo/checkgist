import {
  bookmarksByPositionIndexName,
  bookmarksStoreName,
  openCheckgistDatabase,
} from "@/database/checkgistDatabase";
import type { Bookmark } from "@/database/checkgistDatabase";

export type { Bookmark } from "@/database/checkgistDatabase";
export { closeCheckgistDatabaseForTests as closeBookmarkDatabaseForTests } from "@/database/checkgistDatabase";

function withDensePositions(bookmarks: Bookmark[]): Bookmark[] {
  return bookmarks.map((bookmark, position) => ({ ...bookmark, position }));
}

function orderedBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  return bookmarks.toSorted((first, second) => {
    const positionDiff = first.position - second.position;
    return positionDiff === 0 ? first.routePath.localeCompare(second.routePath) : positionDiff;
  });
}

export async function listBookmarks(): Promise<Bookmark[]> {
  const db = await openCheckgistDatabase();
  return db.getAllFromIndex(bookmarksStoreName, bookmarksByPositionIndexName);
}

export async function addBookmark(input: { routePath: string; title: string }): Promise<Bookmark> {
  const db = await openCheckgistDatabase();
  const tx = db.transaction(bookmarksStoreName, "readwrite");
  const existing = await tx.store.get(input.routePath);

  if (existing !== undefined) {
    await tx.done;
    return existing;
  }

  const bookmarks = orderedBookmarks(await tx.store.getAll());
  const bookmark = {
    routePath: input.routePath,
    title: input.title,
    position: bookmarks.length,
  };
  await Promise.all([tx.store.put(bookmark), tx.done]);
  return bookmark;
}

export async function removeBookmark(routePath: string): Promise<Bookmark | null> {
  const db = await openCheckgistDatabase();
  const tx = db.transaction(bookmarksStoreName, "readwrite");
  const bookmarks = orderedBookmarks(await tx.store.getAll());
  const removed = bookmarks.find((bookmark) => bookmark.routePath === routePath);

  if (removed === undefined) {
    await tx.done;
    return null;
  }

  const remaining = withDensePositions(
    bookmarks.filter((bookmark) => bookmark.routePath !== routePath),
  );
  await Promise.all([
    tx.store.delete(routePath),
    ...remaining.map((bookmark) => tx.store.put(bookmark)),
    tx.done,
  ]);
  return removed;
}

export async function renameBookmark(routePath: string, title: string): Promise<Bookmark | null> {
  const db = await openCheckgistDatabase();
  const tx = db.transaction(bookmarksStoreName, "readwrite");
  const bookmark = await tx.store.get(routePath);

  if (bookmark === undefined) {
    await tx.done;
    return null;
  }

  const renamed = { ...bookmark, title };
  await Promise.all([tx.store.put(renamed), tx.done]);
  return renamed;
}

export async function reorderBookmark(routePath: string, toIndex: number): Promise<Bookmark[]> {
  const db = await openCheckgistDatabase();
  const tx = db.transaction(bookmarksStoreName, "readwrite");
  const bookmarks = orderedBookmarks(await tx.store.getAll());
  const fromIndex = bookmarks.findIndex((bookmark) => bookmark.routePath === routePath);

  if (fromIndex === -1) {
    await tx.done;
    return bookmarks;
  }

  const [bookmark] = bookmarks.splice(fromIndex, 1);
  if (bookmark === undefined) {
    await tx.done;
    return bookmarks;
  }

  bookmarks.splice(Math.max(0, Math.min(toIndex, bookmarks.length)), 0, bookmark);
  const normalized = withDensePositions(bookmarks);
  await Promise.all([...normalized.map((nextBookmark) => tx.store.put(nextBookmark)), tx.done]);
  return normalized;
}

export async function restoreBookmark(bookmark: Bookmark, toIndex: number): Promise<Bookmark[]> {
  const db = await openCheckgistDatabase();
  const tx = db.transaction(bookmarksStoreName, "readwrite");
  const bookmarks = orderedBookmarks(await tx.store.getAll()).filter(
    (currentBookmark) => currentBookmark.routePath !== bookmark.routePath,
  );
  bookmarks.splice(Math.max(0, Math.min(toIndex, bookmarks.length)), 0, bookmark);
  const normalized = withDensePositions(bookmarks);
  await Promise.all([...normalized.map((nextBookmark) => tx.store.put(nextBookmark)), tx.done]);
  return normalized;
}
