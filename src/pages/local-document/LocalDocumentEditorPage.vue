<script setup lang="ts">
import { ExternalLink, Save, Trash2 } from "@lucide/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from "vue-router";

import {
  getLocalDocument,
  isLocalDocumentId,
  localDocumentViewRoute,
  useLocalDocuments,
  validateLocalDocumentTitle,
} from "@/local-documents";
import { useBookmarks } from "@/bookmarks";

import LocalDocumentPreview from "./LocalDocumentPreview.vue";

const route = useRoute();
const router = useRouter();
const { saveDocument, deleteDocument } = useLocalDocuments();
const { refresh: refreshBookmarks, invalidate: invalidateBookmarks } = useBookmarks();
const title = ref("");
const content = ref("");
const savedTitle = ref("");
const savedContent = ref("");
const state = ref<"loading" | "ready" | "missing" | "error">("loading");
const error = ref("");
const isSaving = ref(false);
const isDeleting = ref(false);
const previewActive = ref(false);
const contentTextarea = useTemplateRef<HTMLTextAreaElement>("contentTextarea");

const documentId = computed(() => String(route.params.documentId ?? ""));
const titleValidation = computed(() => validateLocalDocumentTitle(title.value));
const isDirty = computed(
  () => title.value !== savedTitle.value || content.value !== savedContent.value,
);
const canSave = computed(
  () => state.value === "ready" && isDirty.value && titleValidation.value.valid && !isSaving.value,
);

async function loadDocument(id: string) {
  state.value = "loading";
  error.value = "";
  if (!isLocalDocumentId(id)) {
    state.value = "missing";
    return;
  }

  try {
    const document = await getLocalDocument(id);
    if (document === null) {
      state.value = "missing";
      return;
    }
    title.value = document.title;
    content.value = document.content;
    savedTitle.value = document.title;
    savedContent.value = document.content;
    state.value = "ready";
    await nextTick();
    contentTextarea.value?.focus();
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : "Failed to load Local Document.";
    state.value = "error";
  }
}

async function save() {
  if (!canSave.value) return;

  isSaving.value = true;
  error.value = "";
  try {
    const saved = await saveDocument({
      id: documentId.value,
      title: title.value,
      content: content.value,
    });
    if (saved === null) {
      state.value = "missing";
      return;
    }
    title.value = saved.title;
    content.value = saved.content;
    savedTitle.value = saved.title;
    savedContent.value = saved.content;
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : "Failed to save Local Document.";
  } finally {
    isSaving.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void save();
  }
}

async function deleteCurrentDocument() {
  if (!window.confirm(`Delete “${title.value}”? This cannot be undone.`)) return;

  isDeleting.value = true;
  error.value = "";
  try {
    const deleted = await deleteDocument(documentId.value);
    if (deleted === null) {
      state.value = "missing";
      return;
    }
  } catch (deleteError) {
    isDeleting.value = false;
    error.value =
      deleteError instanceof Error ? deleteError.message : "Failed to delete Local Document.";
    return;
  }

  try {
    await refreshBookmarks();
  } catch {
    // The delete transaction already committed; clear the stale shared cache and
    // let the home page reload it instead of presenting a deleted draft as intact.
    invalidateBookmarks();
  }

  await router.push("/");
}

function beforeUnload(event: BeforeUnloadEvent) {
  if (isDirty.value && !isDeleting.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}

watch(documentId, (id) => void loadDocument(id), { immediate: true });
onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", beforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", beforeUnload);
});

onBeforeRouteLeave(() => {
  if (!isDirty.value || isDeleting.value) return true;
  return window.confirm("Discard unsaved changes?");
});
</script>

<template>
  <main
    class="flex h-dvh flex-col overflow-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
  >
    <header class="shrink-0 px-4 py-3">
      <div
        v-if="state === 'ready'"
        class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2"
      >
        <RouterLink
          class="rounded-sm focus:ring-2 focus:ring-blue-600/30 focus:outline-none"
          to="/"
        >
          <h1 class="text-lg font-semibold tracking-normal">Checkgist</h1>
        </RouterLink>
        <label class="sr-only" for="local-document-title-desktop">Title</label>
        <input
          id="local-document-title-desktop"
          v-model="title"
          class="hidden h-9 min-w-40 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600/30 sm:block dark:border-zinc-700 dark:bg-zinc-950"
          :aria-invalid="!titleValidation.valid"
          type="text"
        />
        <RouterLink
          class="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none sm:ml-0 sm:w-auto sm:px-3 dark:border-zinc-700 dark:hover:bg-zinc-900"
          :to="localDocumentViewRoute(documentId)"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Browse"
          title="Browse"
        >
          <ExternalLink class="size-4" aria-hidden="true" />
          <span class="hidden sm:inline">Browse</span>
        </RouterLink>
        <button
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3 dark:border-zinc-700 dark:hover:bg-zinc-900"
          type="button"
          :disabled="!canSave"
          aria-label="Save"
          title="Save"
          @click="save"
        >
          <Save class="size-4" aria-hidden="true" />
          <span class="hidden sm:inline"> Save </span>
        </button>
        <button
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-md border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-600/30 focus:outline-none disabled:opacity-50 sm:w-auto sm:px-3 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          type="button"
          :disabled="isDeleting"
          aria-label="Delete Local Document"
          @click="deleteCurrentDocument"
        >
          <Trash2 class="size-4" aria-hidden="true" />
          <span class="hidden sm:inline">Delete</span>
        </button>
        <p
          v-if="!titleValidation.valid || error"
          class="basis-full text-sm font-medium text-red-700 dark:text-red-300"
          role="alert"
        >
          {{ !titleValidation.valid ? titleValidation.message : error }}
        </p>
      </div>
      <p
        v-else-if="state === 'loading'"
        class="mx-auto max-w-6xl text-sm text-zinc-600 dark:text-zinc-400"
      >
        Loading Local Document...
      </p>
      <div
        v-else-if="state === 'missing'"
        class="mx-auto flex max-w-6xl items-center justify-between gap-3"
      >
        <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Local document not found.
        </p>
        <RouterLink
          class="rounded-sm text-sm text-blue-700 underline focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-blue-300"
          to="/"
          >Back to home</RouterLink
        >
      </div>
      <div v-else class="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <p class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">{{ error }}</p>
        <RouterLink
          class="rounded-sm text-sm text-blue-700 underline focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-blue-300"
          to="/"
          >Back to home</RouterLink
        >
      </div>
    </header>

    <template v-if="state === 'ready'">
      <div class="flex shrink-0 gap-2 px-4 sm:hidden">
        <button
          class="h-9 shrink-0 rounded-md border border-zinc-300 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700"
          :class="previewActive ? 'bg-zinc-100 dark:bg-zinc-900' : ''"
          type="button"
          :aria-pressed="previewActive"
          @click="previewActive = !previewActive"
        >
          Preview
        </button>
        <label class="sr-only" for="local-document-title">Title</label>
        <input
          id="local-document-title"
          v-model="title"
          class="h-9 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:bg-zinc-950"
          :aria-invalid="!titleValidation.valid"
          type="text"
        />
      </div>
      <div class="min-h-0 flex-1 px-4 py-3 sm:pt-0">
        <div
          class="mx-auto flex h-full max-w-6xl sm:divide-x sm:divide-zinc-200 dark:sm:divide-zinc-800"
        >
          <textarea
            ref="contentTextarea"
            v-model="content"
            class="h-full min-h-0 w-full resize-none rounded-md border border-zinc-300 bg-white p-4 font-mono text-sm leading-6 outline-none sm:block sm:w-1/2 dark:border-zinc-700 dark:bg-zinc-950"
            :class="previewActive ? 'hidden' : 'block'"
            aria-label="Markdown content"
          />
          <div
            class="h-full min-h-0 w-full overflow-hidden sm:block sm:w-1/2"
            :class="previewActive ? 'block' : 'hidden'"
          >
            <LocalDocumentPreview :content="content" />
          </div>
        </div>
      </div>
    </template>
  </main>
</template>
