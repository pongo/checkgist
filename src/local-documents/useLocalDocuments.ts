import { computed, readonly, ref } from "vue";

import { useBookmarks } from "@/bookmarks";
import { requestPersistentStorageOnce } from "@/shared/persistent-storage";
import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";

import {
  createLocalDocument as createLocalDocumentInDatabase,
  deleteLocalDocument as deleteLocalDocumentInDatabase,
  getLocalDocument as getLocalDocumentInDatabase,
  listLocalDocuments,
  saveLocalDocument as saveLocalDocumentInDatabase,
  type LocalDocument,
} from "./db";
import { localDocumentViewRoute } from "./routes";

type LocalDocumentStatus = "idle" | "loading" | "ready" | "error";

/**
 * Provides Local Document operations and a scope-local reactive list snapshot.
 * IndexedDB remains authoritative, and each new snapshot reads current persisted data.
 */
export function useLocalDocuments() {
  const documents = ref<LocalDocument[]>([]);
  const status = ref<LocalDocumentStatus>("idle");
  const error = ref<unknown>(null);
  let loadPromise: Promise<void> | null = null;
  let stateOperation: Promise<void> = Promise.resolve();

  function serializeStateOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = stateOperation.then(operation, operation);
    stateOperation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function refreshState(): Promise<void> {
    documents.value = await listLocalDocuments();
    error.value = null;
    status.value = "ready";
  }

  async function refresh(): Promise<void> {
    return serializeStateOperation(refreshState);
  }

  async function getDocument(documentId: string): Promise<LocalDocument | null> {
    return serializeStateOperation(() => getLocalDocumentInDatabase(documentId));
  }

  async function ensureLoaded(): Promise<void> {
    if (status.value === "ready") return;
    if (loadPromise !== null) return loadPromise;

    status.value = "loading";
    loadPromise = refresh()
      .catch((loadError: unknown) => {
        error.value = loadError;
        status.value = "error";
      })
      .finally(() => {
        loadPromise = null;
      });
    return loadPromise;
  }

  void ensureLoaded();

  async function createDocument(): Promise<LocalDocument> {
    const document = await serializeStateOperation(async () => {
      const created = await createLocalDocumentInDatabase();
      await refreshState();
      return created;
    });
    requestPersistentStorageOnce();
    return document;
  }

  async function saveDocument(input: { id: string; title: string; content: string }) {
    const saved = await serializeStateOperation(async () => {
      const result = await saveLocalDocumentInDatabase(input);
      if (result !== null && status.value !== "idle") await refreshState();
      return result;
    });
    return saved;
  }

  async function deleteDocument(documentId: string) {
    const deleted = await serializeStateOperation(async () => {
      const result = await deleteLocalDocumentInDatabase(documentId);
      if (result !== null) {
        // The transaction has committed, so update this snapshot without a second
        // read that could turn a completed deletion into a reported failure.
        documents.value = documents.value.filter((document) => document.id !== result.id);
      }
      return result;
    });

    if (deleted === null) return null;

    const { removeBookmark, invalidate } = useBookmarks();
    try {
      await removeBookmark(localDocumentViewRoute(documentId));
    } catch {
      // Local Document deletion is intentionally committed before Bookmark cleanup.
      // Invalidate the shared cache because cleanup failure cannot roll it back.
      invalidate();
    }

    return deleted;
  }

  return {
    documents: readonly(documents),
    status: readonly(status),
    error: readonly(error),
    isReady: computed(() => status.value === "ready"),
    refresh,
    getDocument,
    createDocument,
    saveDocument,
    deleteDocument,
  };
}

/** Closes shared database resources between tests. */
export async function resetLocalDocumentsForTests(): Promise<void> {
  await closeCheckgistDatabaseForTests();
}
