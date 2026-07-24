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

async function createDocument(): Promise<LocalDocument> {
  return serializeStateOperation(async () => {
    const document = await createLocalDocumentInDatabase();
    await refreshState();
    requestPersistentStorageOnce();
    return document;
  });
}

async function saveDocument(input: { id: string; title: string; content: string }) {
  return serializeStateOperation(async () => {
    const saved = await saveLocalDocumentInDatabase(input);
    if (saved !== null) await refreshState();
    return saved;
  });
}

async function deleteDocument(documentId: string) {
  const deleted = await serializeStateOperation(async () => {
    const deleted = await deleteLocalDocumentInDatabase(documentId);
    if (deleted !== null) {
      // The transaction has committed, so update the cache without a second read
      // that could turn a completed deletion into a reported failure.
      documents.value = documents.value.filter((document) => document.id !== deleted.id);
    }
    return deleted;
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

/**
 * Returns the shared lazy Local Documents state and persistence commands.
 *
 * `deleteDocument` removes the Local Document's owned Bookmark after the document
 * commit. Bookmark cleanup failure invalidates Bookmark state but does not turn
 * the committed deletion into a reported failure.
 */
export function useLocalDocuments() {
  return {
    documents: readonly(documents),
    status: readonly(status),
    error: readonly(error),
    isReady: computed(() => status.value === "ready"),
    ensureLoaded,
    refresh,
    getDocument,
    createDocument,
    saveDocument,
    deleteDocument,
  };
}

/** Resets the shared Local Documents cache and database connection for isolated tests. */
export async function resetLocalDocumentsForTests(): Promise<void> {
  await closeCheckgistDatabaseForTests();
  documents.value = [];
  status.value = "idle";
  error.value = null;
  loadPromise = null;
  stateOperation = Promise.resolve();
}
