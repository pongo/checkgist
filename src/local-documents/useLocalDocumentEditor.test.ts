import "fake-indexeddb/auto";

import { flushPromises } from "@vue/test-utils";
import { IDBFactory } from "fake-indexeddb";
import { effectScope, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalDocument } from "./db";
import { resetLocalDocumentsForTests } from "./useLocalDocuments";
import { useLocalDocumentEditor } from "./useLocalDocumentEditor";

const documentId = "11111111-1111-4111-8111-111111111111";

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

async function mountEditor(id = documentId) {
  const scope = effectScope();
  const documentIdRef = ref(id);
  let editor!: ReturnType<typeof useLocalDocumentEditor>;
  scope.run(() => {
    editor = useLocalDocumentEditor(documentIdRef);
  });
  await vi.waitFor(() => expect(editor.state.value).not.toBe("loading"));
  return { editor, documentIdRef, scope };
}

beforeEach(async () => {
  await resetLocalDocumentsForTests();
  resetIndexedDb();
  vi.stubGlobal("crypto", { randomUUID: () => documentId });
});

afterEach(async () => {
  await resetLocalDocumentsForTests();
  vi.unstubAllGlobals();
});

describe("useLocalDocumentEditor", () => {
  it("loads a persisted Local Document and adopts the normalized save result", async () => {
    await createLocalDocument(documentId);
    const { editor, scope } = await mountEditor();

    expect(editor.state.value).toBe("ready");
    expect(editor.title.value).toBe("Untitled document");
    expect(editor.isDirty.value).toBe(false);

    editor.title.value = "  Packing  ";
    editor.content.value = "# Exact\n";
    expect(editor.canSave.value).toBe(true);

    await editor.save();

    expect(editor.title.value).toBe("Packing");
    expect(editor.content.value).toBe("# Exact\n");
    expect(editor.isDirty.value).toBe(false);
    expect(editor.canSave.value).toBe(false);
    scope.stop();
  });

  it("reports invalid and missing route IDs without reading storage", async () => {
    const invalid = await mountEditor("not-a-uuid");
    expect(invalid.editor.state.value).toBe("missing");
    invalid.scope.stop();

    const missing = await mountEditor("22222222-2222-4222-8222-222222222222");
    expect(missing.editor.state.value).toBe("missing");
    missing.scope.stop();
  });

  it("keeps dirty state after a failed save", async () => {
    await createLocalDocument(documentId);
    const { editor, scope } = await mountEditor();
    editor.content.value = "- [ ] Passport";

    await resetLocalDocumentsForTests();
    vi.stubGlobal("indexedDB", undefined);
    await expect(editor.save()).rejects.toThrow("open");
    await flushPromises();

    expect(editor.error.value).toBeTruthy();
    expect(editor.isDirty.value).toBe(true);
    expect(editor.canSave.value).toBe(true);
    scope.stop();
  });
});
