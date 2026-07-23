<script setup lang="ts">
import { FilePlus2, Pencil, Trash2 } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useBookmarks } from "@/bookmarks";

import { localDocumentEditRoute, localDocumentViewRoute } from "./source-service";
import type { LocalDocument } from "./types";
import { useLocalDocuments } from "./useLocalDocuments";

const router = useRouter();
const {
  documents,
  status,
  error,
  ensureLoaded,
  refresh: refreshDocuments,
  createDocument,
  deleteDocument,
} = useLocalDocuments();
const { refresh: refreshBookmarks, invalidate: invalidateBookmarks } = useBookmarks();
const isCreating = ref(false);
const deletingDocumentIds = ref(new Set<string>());
const createError = ref("");
const deleteError = ref("");

async function createAndOpenDocument() {
  if (isCreating.value) return;

  isCreating.value = true;
  createError.value = "";
  try {
    const document = await createDocument();
    await router.push(localDocumentEditRoute(document.id));
  } catch (error) {
    createError.value = error instanceof Error ? error.message : "Failed to create Local Document.";
  } finally {
    isCreating.value = false;
  }
}

function isDeletingDocument(documentId: string): boolean {
  return deletingDocumentIds.value.has(documentId);
}

function setDocumentDeleting(documentId: string, isDeleting: boolean) {
  const nextIds = new Set(deletingDocumentIds.value);
  if (isDeleting) {
    nextIds.add(documentId);
  } else {
    nextIds.delete(documentId);
  }
  deletingDocumentIds.value = nextIds;
}

function preventEditWhileDeleting(documentId: string, event: MouseEvent) {
  if (isDeletingDocument(documentId)) event.preventDefault();
}

async function deleteLocalDocument(document: LocalDocument) {
  if (
    isDeletingDocument(document.id) ||
    !window.confirm(`Delete “${document.title}”? This cannot be undone.`)
  ) {
    return;
  }

  setDocumentDeleting(document.id, true);
  deleteError.value = "";
  try {
    const deleted = await deleteDocument(document.id);
    if (deleted === null) {
      // Another tab may have deleted the document while this shared cache was stale.
      await refreshDocuments();
    }

    try {
      await refreshBookmarks();
    } catch {
      // The document transaction is already committed; discard stale Bookmark state
      // so its next consumer reloads the database instead of showing an orphaned link.
      invalidateBookmarks();
    }
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : "Failed to delete Local Document.";
  } finally {
    setDocumentDeleting(document.id, false);
  }
}

onMounted(() => {
  void ensureLoaded();
});
</script>

<template>
  <section class="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Local documents</h2>
      <button
        class="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-950 focus:ring-2 focus:ring-blue-600/30 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-50"
        type="button"
        :disabled="isCreating"
        @click="createAndOpenDocument"
      >
        <FilePlus2 class="size-3.5" aria-hidden="true" />
        New document
      </button>
    </div>

    <p v-if="status === 'loading'" class="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
      Loading Local Documents...
    </p>
    <p
      v-else-if="status === 'ready' && documents.length === 0"
      class="mt-3 text-sm text-zinc-600 dark:text-zinc-400"
    >
      No local documents yet
    </p>
    <ul v-else-if="status === 'ready'" class="mt-3 space-y-1">
      <li
        v-for="document in documents"
        :key="document.id"
        class="group flex h-6 items-center gap-3"
      >
        <span
          class="size-1.5 shrink-0 rounded-full bg-zinc-950 dark:bg-zinc-50"
          aria-hidden="true"
        />
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <RouterLink
            class="min-w-0 flex-1 truncate rounded-sm text-base text-zinc-800 group-hover:text-[#0969da] focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-200 dark:group-hover:text-[#4493f8]"
            :to="localDocumentViewRoute(document.id)"
          >
            {{ document.title }}
          </RouterLink>
          <div
            class="ml-auto flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          >
            <RouterLink
              class="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              :class="isDeletingDocument(document.id) ? 'pointer-events-none opacity-50' : ''"
              :to="localDocumentEditRoute(document.id)"
              :aria-disabled="isDeletingDocument(document.id) ? 'true' : undefined"
              :tabindex="isDeletingDocument(document.id) ? -1 : undefined"
              aria-label="Edit Local Document"
              @click="preventEditWhileDeleting(document.id, $event)"
            >
              <Pencil class="size-3.5" aria-hidden="true" />
            </RouterLink>
            <button
              class="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-700 focus:text-red-700 focus:ring-2 focus:ring-red-600/30 focus:outline-none disabled:cursor-wait disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 dark:focus:text-red-300"
              type="button"
              :disabled="isDeletingDocument(document.id)"
              aria-label="Delete Local Document"
              @click="deleteLocalDocument(document)"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </li>
    </ul>
    <p
      v-if="error || createError || deleteError"
      class="mt-3 text-sm font-medium text-red-700 dark:text-red-300"
      role="alert"
    >
      {{ deleteError || createError || "Failed to load Local Documents." }}
    </p>
  </section>
</template>
