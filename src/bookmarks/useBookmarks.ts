import { computed, getCurrentScope, onScopeDispose, readonly, ref } from "vue";

import { requestPersistentStorageOnce } from "@/shared/persistent-storage";

import {
  addBookmark as addBookmarkToDatabase,
  type Bookmark,
  listBookmarks,
  removeBookmark as removeBookmarkFromDatabase,
  renameBookmark as renameBookmarkInDatabase,
  reorderBookmark as reorderBookmarkInDatabase,
  restoreBookmark as restoreBookmarkInDatabase,
} from "./db";

type BookmarkStatus = "idle" | "loading" | "ready" | "error";
type BookmarkChangeListener = () => void;

const bookmarkChangeListeners = new Set<BookmarkChangeListener>();

function notifyBookmarkChange(source: BookmarkChangeListener | null): void {
  for (const listener of bookmarkChangeListeners) {
    if (listener !== source) listener();
  }
}

/**
 * Provides Bookmark commands and a scope-local reactive list snapshot.
 *
 * IndexedDB remains authoritative. Same-tab mutations ask other active Vue scopes
 * to refresh, while each new scope independently reads current persisted data.
 */
export function useBookmarks() {
  const bookmarks = ref<Bookmark[]>([]);
  const status = ref<BookmarkStatus>("idle");
  const error = ref<unknown>(null);
  let loadPromise: Promise<void> | null = null;
  let stateVersion = 0;
  let snapshotListener: BookmarkChangeListener | null = null;

  async function refreshBookmarks(): Promise<void> {
    const refreshVersion = stateVersion;
    const nextBookmarks = await listBookmarks();

    // Ignore reads started before invalidation so stale async work cannot restore old state.
    if (refreshVersion !== stateVersion) return;

    bookmarks.value = nextBookmarks;
    error.value = null;
    status.value = "ready";
  }

  function handleRefreshError(refreshError: unknown): void {
    error.value = refreshError;
    status.value = "error";
  }

  function invalidateBookmarks(): void {
    // Stryker disable next-line AssignmentOperator: versions are only compared for equality, so either monotonic direction invalidates older reads.
    stateVersion += 1;
    bookmarks.value = [];
    error.value = null;
    status.value = "idle";
    loadPromise = null;
    notifyBookmarkChange(snapshotListener);
    void ensureLoaded();
  }

  async function ensureLoaded(): Promise<void> {
    if (status.value === "ready") return;
    if (loadPromise !== null) return loadPromise;

    status.value = "loading";
    const loadVersion = stateVersion;
    const currentLoad = refreshBookmarks()
      .catch((loadError: unknown) => {
        if (loadVersion === stateVersion) handleRefreshError(loadError);
      })
      .finally(() => {
        if (loadPromise === currentLoad) loadPromise = null;
      });
    loadPromise = currentLoad;
    return loadPromise;
  }

  function replaceBookmark(bookmark: Bookmark): void {
    bookmarks.value = bookmarks.value.map((currentBookmark) =>
      currentBookmark.routePath === bookmark.routePath ? bookmark : currentBookmark,
    );
  }

  async function addBookmark(input: {
    routePath: string;
    title: string;
  }): Promise<Bookmark | null> {
    await ensureLoaded();
    if (status.value !== "ready") return null;

    const hadBookmark = bookmarks.value.some((bookmark) => bookmark.routePath === input.routePath);
    const bookmark = await addBookmarkToDatabase(input);
    notifyBookmarkChange(snapshotListener);
    await refreshBookmarks();

    if (!hadBookmark) requestPersistentStorageOnce();
    return bookmark;
  }

  async function removeBookmark(routePath: string): Promise<Bookmark | null> {
    await ensureLoaded();
    if (status.value !== "ready") return null;

    const removed = await removeBookmarkFromDatabase(routePath);
    if (removed !== null) notifyBookmarkChange(snapshotListener);
    await refreshBookmarks();
    return removed;
  }

  async function renameBookmark(routePath: string, title: string): Promise<Bookmark | null> {
    await ensureLoaded();
    if (status.value !== "ready") return null;

    const renamed = await renameBookmarkInDatabase(routePath, title);
    if (renamed !== null) {
      replaceBookmark(renamed);
      notifyBookmarkChange(snapshotListener);
    }
    return renamed;
  }

  async function reorderBookmark(routePath: string, toIndex: number): Promise<void> {
    await ensureLoaded();
    if (status.value !== "ready") return;

    bookmarks.value = await reorderBookmarkInDatabase(routePath, toIndex);
    notifyBookmarkChange(snapshotListener);
  }

  async function restoreBookmark(bookmark: Bookmark, toIndex: number): Promise<void> {
    await ensureLoaded();
    if (status.value !== "ready") return;

    bookmarks.value = await restoreBookmarkInDatabase(bookmark, toIndex);
    notifyBookmarkChange(snapshotListener);
  }

  if (getCurrentScope() !== undefined) {
    snapshotListener = () => {
      const refreshVersion = stateVersion;
      void refreshBookmarks().catch((refreshError: unknown) => {
        if (refreshVersion === stateVersion) handleRefreshError(refreshError);
      });
    };
    bookmarkChangeListeners.add(snapshotListener);
    onScopeDispose(() => {
      if (snapshotListener !== null) bookmarkChangeListeners.delete(snapshotListener);
    });
  }

  void ensureLoaded();

  return {
    bookmarks: readonly(bookmarks),
    status: readonly(status),
    error: readonly(error),
    isReady: computed(() => status.value === "ready"),
    ensureLoaded,
    refresh: refreshBookmarks,
    invalidate: invalidateBookmarks,
    addBookmark,
    removeBookmark,
    renameBookmark,
    reorderBookmark,
    restoreBookmark,
  };
}
