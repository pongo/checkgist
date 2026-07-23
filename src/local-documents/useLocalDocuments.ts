import { computed, readonly, ref } from "vue";

import { requestPersistentStorageOnce } from "@/shared/persistent-storage";
import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";

import {
  createLocalDocument as createLocalDocumentInDatabase,
  deleteLocalDocument as deleteLocalDocumentInDatabase,
  listLocalDocuments,
  saveLocalDocument as saveLocalDocumentInDatabase,
  type LocalDocument,
} from "./db";

type LocalDocumentStatus = "idle" | "loading" | "ready" | "error";

const documents = ref<LocalDocument[]>([]);
const status = ref<LocalDocumentStatus>("idle");
const error = ref<unknown>(null);
let loadPromise: Promise<void> | null = null;

async function refresh(): Promise<void> {
  documents.value = await listLocalDocuments();
  error.value = null;
  status.value = "ready";
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
  const document = await createLocalDocumentInDatabase();
  await refresh();
  requestPersistentStorageOnce();
  return document;
}

async function saveDocument(input: { id: string; title: string; content: string }) {
  const saved = await saveLocalDocumentInDatabase(input);
  if (saved !== null) await refresh();
  return saved;
}

async function deleteDocument(documentId: string) {
  const deleted = await deleteLocalDocumentInDatabase(documentId);
  if (deleted !== null && status.value === "ready") {
    // The transaction has committed, so remove the cache entry without risking a
    // second database read turning a completed deletion into a reported failure.
    documents.value = documents.value.filter((document) => document.id !== deleted.id);
  }
  return deleted;
}

/** Returns the shared lazy Local Documents state and persistence commands. */
export function useLocalDocuments() {
  return {
    documents: readonly(documents),
    status: readonly(status),
    error: readonly(error),
    isReady: computed(() => status.value === "ready"),
    ensureLoaded,
    refresh,
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
}
