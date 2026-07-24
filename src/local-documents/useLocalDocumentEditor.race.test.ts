import { flushPromises } from "@vue/test-utils";
import { computed, nextTick, reactive, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const pending = new Map<
  string,
  (value: {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
  }) => void
>();
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
      new Promise((resolve) => {
        pending.set(id, resolve);
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

    pending.get(secondId)?.({
      id: secondId,
      title: "Second",
      content: "second",
      createdAt: 2,
      updatedAt: 2,
    });
    await flushPromises();
    pending.get(firstId)?.({
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

  it("prevents delete while a save is active", async () => {
    pending.get(firstId)?.({
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
    pending.get(firstId)?.({
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
