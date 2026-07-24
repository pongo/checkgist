import { computed, readonly, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

import { isLocalDocumentId, validateLocalDocumentTitle } from "./types";
import { useLocalDocuments } from "./useLocalDocuments";

type LocalDocumentEditorState = "loading" | "ready" | "missing" | "error";

/**
 * Coordinates the reusable load, draft, validation, save and delete lifecycle for one Local Document.
 * Browser and router effects remain outside this module at the page adapter seam.
 */
export function useLocalDocumentEditor(documentId: MaybeRefOrGetter<string>) {
  const { getDocument, saveDocument, deleteDocument } = useLocalDocuments();
  const title = ref("");
  const content = ref("");
  const savedTitle = ref("");
  const savedContent = ref("");
  const state = ref<LocalDocumentEditorState>("loading");
  const error = ref("");
  const isSaving = ref(false);
  const isDeleting = ref(false);
  const loadGeneration = ref(0);
  let mutationGeneration = 0;

  const titleValidation = computed(() => validateLocalDocumentTitle(title.value));
  const isDirty = computed(
    () => title.value !== savedTitle.value || content.value !== savedContent.value,
  );
  const canSave = computed(
    () =>
      state.value === "ready" &&
      isDirty.value &&
      titleValidation.value.valid &&
      !isSaving.value &&
      !isDeleting.value,
  );
  const canDelete = computed(() => state.value === "ready" && !isSaving.value && !isDeleting.value);

  async function load(id: string, generation: number): Promise<void> {
    state.value = "loading";
    error.value = "";
    isSaving.value = false;
    isDeleting.value = false;

    if (!isLocalDocumentId(id)) {
      state.value = "missing";
      return;
    }

    try {
      const document = await getDocument(id);
      if (generation !== loadGeneration.value || toValue(documentId) !== id) return;
      if (document === null) {
        state.value = "missing";
        return;
      }

      title.value = document.title;
      content.value = document.content;
      savedTitle.value = document.title;
      savedContent.value = document.content;
      state.value = "ready";
    } catch (loadError) {
      if (generation !== loadGeneration.value || toValue(documentId) !== id) return;
      error.value =
        loadError instanceof Error ? loadError.message : "Failed to load Local Document.";
      state.value = "error";
    }
  }

  async function save() {
    if (!canSave.value) return null;

    const id = toValue(documentId);
    const operationGeneration = mutationGeneration;
    isSaving.value = true;
    error.value = "";
    try {
      const saved = await saveDocument({
        id,
        title: title.value,
        content: content.value,
      });
      if (operationGeneration !== mutationGeneration || toValue(documentId) !== id) return saved;
      if (saved === null) {
        state.value = "missing";
        return null;
      }

      title.value = saved.title;
      content.value = saved.content;
      savedTitle.value = saved.title;
      savedContent.value = saved.content;
      return saved;
    } catch (saveError) {
      if (operationGeneration === mutationGeneration && toValue(documentId) === id) {
        error.value =
          saveError instanceof Error ? saveError.message : "Failed to save Local Document.";
      }
      throw saveError;
    } finally {
      if (operationGeneration === mutationGeneration && toValue(documentId) === id) {
        isSaving.value = false;
      }
    }
  }

  async function remove() {
    if (!canDelete.value) return null;

    const id = toValue(documentId);
    const operationGeneration = mutationGeneration;
    isDeleting.value = true;
    error.value = "";
    let keepDeletingForNavigation = false;
    try {
      const deleted = await deleteDocument(id);
      if (operationGeneration !== mutationGeneration || toValue(documentId) !== id) return deleted;
      if (deleted === null) {
        state.value = "missing";
      } else {
        keepDeletingForNavigation = true;
      }
      return deleted;
    } catch (deleteError) {
      if (operationGeneration === mutationGeneration && toValue(documentId) === id) {
        error.value =
          deleteError instanceof Error ? deleteError.message : "Failed to delete Local Document.";
      }
      throw deleteError;
    } finally {
      if (
        !keepDeletingForNavigation &&
        operationGeneration === mutationGeneration &&
        toValue(documentId) === id
      ) {
        isDeleting.value = false;
      }
    }
  }

  watch(
    () => toValue(documentId),
    (id) => {
      loadGeneration.value += 1;
      mutationGeneration += 1;
      void load(id, loadGeneration.value);
    },
    { immediate: true },
  );

  return {
    title,
    content,
    state: readonly(state),
    error: readonly(error),
    isSaving: readonly(isSaving),
    isDeleting: readonly(isDeleting),
    titleValidation,
    isDirty,
    canSave,
    canDelete,
    save,
    deleteDocument: remove,
  };
}
