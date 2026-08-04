import { flushPromises } from "@vue/test-utils";
import { computed, nextTick, reactive, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
type PendingDocument = {
  resolve: (value: {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
  }) => void;
  reject: (reason?: unknown) => void;
};
const pending = new Map<string, PendingDocument[]>();

function getPending(id: string, index = 0) {
  return pending.get(id)?.[index];
}
const saveDocument = vi.hoisted(() =>
  vi.fn<
    (input: { id: string; title: string; content: string }) => Promise<{
      id: string;
      title: string;
      content: string;
    } | null>
  >(),
);
const deleteDocument = vi.hoisted(() => vi.fn<(id: string) => Promise<{ id: string } | null>>());

vi.mock("./useLocalDocuments", () => ({
  useLocalDocuments: () => ({
    getDocument: (id: string) =>
      new Promise((resolve, reject) => {
        pending.set(id, [...(pending.get(id) ?? []), { resolve, reject }]);
      }),
    saveDocument,
    deleteDocument,
  }),
}));

import { useLocalDocumentEditor } from "./useLocalDocumentEditor";

describe("useLocalDocumentEditor route races", () => {
  beforeEach(() => {
    pending.clear();
    saveDocument.mockReset();
    deleteDocument.mockReset();
  });

  it("keeps the latest route document when reads resolve out of order", async () => {
    const route = reactive({ documentId: firstId });
    const editor = useLocalDocumentEditor(computed(() => route.documentId));

    await nextTick();
    route.documentId = secondId;
    await nextTick();

    getPending(secondId)?.resolve({
      id: secondId,
      title: "Second",
      content: "second",
      createdAt: 2,
      updatedAt: 2,
    });
    await flushPromises();
    getPending(firstId)?.resolve({
      id: firstId,
      title: "First",
      content: "first",
      createdAt: 1,
      updatedAt: 1,
    });
    await flushPromises();

    expect(editor.title.value).toBe("Second");
    expect(editor.content.value).toBe("second");
    expect(editor.state.value).toBe("ready");
  });

  it("ignores a stale load error after the route changes", async () => {
    const route = reactive({ documentId: firstId });
    const editor = useLocalDocumentEditor(computed(() => route.documentId));

    await nextTick();
    route.documentId = secondId;
    await nextTick();

    getPending(secondId)?.resolve({
      id: secondId,
      title: "Second",
      content: "second",
      createdAt: 2,
      updatedAt: 2,
    });
    await flushPromises();
    getPending(firstId)?.reject(new Error("Stale document failed to load."));
    await flushPromises();

    expect(editor.state.value).toBe("ready");
    expect(editor.error.value).toBe("");
    expect(editor.title.value).toBe("Second");
  });

  it("ignores a stale load error when a later generation returns to the same route", async () => {
    const route = reactive({ documentId: firstId });
    const editor = useLocalDocumentEditor(computed(() => route.documentId));

    await nextTick();
    route.documentId = secondId;
    await nextTick();
    route.documentId = firstId;
    await nextTick();

    getPending(firstId)?.reject(new Error("Old document failed to load."));
    await flushPromises();

    expect(editor.state.value).toBe("loading");
    expect(editor.error.value).toBe("");
  });

  it("ignores a load error when the current ID no longer matches the request", async () => {
    let currentId = firstId;
    const editor = useLocalDocumentEditor(() => currentId);

    await nextTick();
    currentId = secondId;
    getPending(firstId)?.reject(new Error("Outdated document failed to load."));
    await flushPromises();

    expect(editor.state.value).toBe("loading");
    expect(editor.error.value).toBe("");
  });

  it("uses the fallback message for a non-Error load failure", async () => {
    const editor = useLocalDocumentEditor(ref(firstId));

    await nextTick();
    getPending(firstId)?.reject("load failed");
    await flushPromises();

    expect(editor.state.value).toBe("error");
    expect(editor.error.value).toBe("Failed to load Local Document.");
  });

  it("uses the fallback message for a non-Error save failure", async () => {
    const editor = useLocalDocumentEditor(ref(firstId));
    await nextTick();
    getPending(firstId)?.resolve({
      id: firstId,
      title: "First",
      content: "first",
      createdAt: 1,
      updatedAt: 1,
    });
    await flushPromises();
    editor.content.value = "changed";
    saveDocument.mockRejectedValue("save failed");

    await expect(editor.save()).rejects.toBe("save failed");

    expect(editor.error.value).toBe("Failed to save Local Document.");
    expect(editor.isSaving.value).toBe(false);
  });

  it("uses the fallback message for a non-Error delete failure", async () => {
    const editor = useLocalDocumentEditor(ref(firstId));
    await nextTick();
    getPending(firstId)?.resolve({
      id: firstId,
      title: "First",
      content: "first",
      createdAt: 1,
      updatedAt: 1,
    });
    await flushPromises();
    deleteDocument.mockRejectedValue("delete failed");

    await expect(editor.deleteDocument()).rejects.toBe("delete failed");

    expect(editor.error.value).toBe("Failed to delete Local Document.");
    expect(editor.isDeleting.value).toBe(false);
  });

  it("prevents delete while a save is active", async () => {
    getPending(firstId)?.resolve({
      id: firstId,
      title: "First",
      content: "first",
      createdAt: 1,
      updatedAt: 1,
    });
    await flushPromises();

    let resolveSave!: (value: { id: string; title: string; content: string }) => void;
    saveDocument.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    const editor = useLocalDocumentEditor(ref(firstId));
    await flushPromises();
    getPending(firstId)?.resolve({
      id: firstId,
      title: "First",
      content: "first",
      createdAt: 1,
      updatedAt: 1,
    });
    await flushPromises();
    editor.content.value = "changed";

    const saving = editor.save();
    await nextTick();
    expect(editor.isSaving.value).toBe(true);
    expect(editor.canDelete.value).toBe(false);
    expect(editor.canSave.value).toBe(false);

    resolveSave({ id: firstId, title: "First", content: "changed" });
    await saving;
    expect(editor.isSaving.value).toBe(false);
  });
});
