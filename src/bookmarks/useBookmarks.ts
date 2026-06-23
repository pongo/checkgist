import { computed, readonly, ref } from "vue";

import { requestPersistentStorageOnce } from "@/shared/persistent-storage";

import {
  addBookmark as addBookmarkToDatabase,
  closeBookmarkDatabaseForTests,
  type Bookmark,
  listBookmarks,
  removeBookmark as removeBookmarkFromDatabase,
  renameBookmark as renameBookmarkInDatabase,
  reorderBookmark as reorderBookmarkInDatabase,
  restoreBookmark as restoreBookmarkInDatabase,
} from "./db";

type BookmarkStatus = "idle" | "loading" | "ready" | "error";

const bookmarks = ref<Bookmark[]>([]);
const status = ref<BookmarkStatus>("idle");
const error = ref<unknown>(null);
let loadPromise: Promise<void> | null = null;

async function refreshBookmarks(): Promise<void> {
  bookmarks.value = await listBookmarks();
}

async function ensureLoaded(): Promise<void> {
  if (status.value === "ready") {
    return;
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  status.value = "loading";
  loadPromise = refreshBookmarks()
    .then(() => {
      error.value = null;
      status.value = "ready";
    })
    .catch((loadError: unknown) => {
      error.value = loadError;
      status.value = "error";
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

function replaceBookmark(bookmark: Bookmark): void {
  bookmarks.value = bookmarks.value.map((currentBookmark) =>
    currentBookmark.routePath === bookmark.routePath ? bookmark : currentBookmark,
  );
}

async function addBookmark(input: { routePath: string; title: string }): Promise<Bookmark | null> {
  await ensureLoaded();

  if (status.value !== "ready") {
    return null;
  }

  const hadBookmark = bookmarks.value.some((bookmark) => bookmark.routePath === input.routePath);
  const bookmark = await addBookmarkToDatabase(input);
  await refreshBookmarks();

  if (!hadBookmark) {
    requestPersistentStorageOnce();
  }

  return bookmark;
}

async function removeBookmark(routePath: string): Promise<Bookmark | null> {
  await ensureLoaded();

  if (status.value !== "ready") {
    return null;
  }

  const removed = await removeBookmarkFromDatabase(routePath);
  await refreshBookmarks();
  return removed;
}

async function renameBookmark(routePath: string, title: string): Promise<Bookmark | null> {
  await ensureLoaded();

  if (status.value !== "ready") {
    return null;
  }

  const renamed = await renameBookmarkInDatabase(routePath, title);

  if (renamed !== null) {
    replaceBookmark(renamed);
  }

  return renamed;
}

async function reorderBookmark(routePath: string, toIndex: number): Promise<void> {
  await ensureLoaded();

  if (status.value !== "ready") {
    return;
  }

  bookmarks.value = await reorderBookmarkInDatabase(routePath, toIndex);
}

async function restoreBookmark(bookmark: Bookmark, toIndex: number): Promise<void> {
  await ensureLoaded();

  if (status.value !== "ready") {
    return;
  }

  bookmarks.value = await restoreBookmarkInDatabase(bookmark, toIndex);
}

/**
 * Returns the shared Bookmark state and commands.
 *
 * Bookmark state is loaded lazily and shared across all callers; this composable
 * is not a factory for independent Bookmark collections.
 */
export function useBookmarks() {
  return {
    bookmarks: readonly(bookmarks),
    status: readonly(status),
    error: readonly(error),
    isReady: computed(() => status.value === "ready"),
    ensureLoaded,
    addBookmark,
    removeBookmark,
    renameBookmark,
    reorderBookmark,
    restoreBookmark,
  };
}

export async function resetBookmarksForTests(): Promise<void> {
  await closeBookmarkDatabaseForTests();
  bookmarks.value = [];
  status.value = "idle";
  error.value = null;
  loadPromise = null;
}
