import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalDocument } from "./db";
import { resetLocalDocumentsForTests, useLocalDocuments } from "./useLocalDocuments";

const listLocalDocuments = vi.hoisted(() => vi.fn<() => Promise<LocalDocument[]>>());
const deleteLocalDocument = vi.hoisted(() =>
  vi.fn<(id: string) => Promise<LocalDocument | null>>(),
);

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  listLocalDocuments,
  deleteLocalDocument,
}));

const document: LocalDocument = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Packing",
  content: "- [ ] Passport",
  createdAt: 1,
  updatedAt: 1,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(async () => {
  await resetLocalDocumentsForTests();
  listLocalDocuments.mockReset();
  deleteLocalDocument.mockReset();
});

describe("useLocalDocuments mutation ordering", () => {
  it("prevents an earlier refresh from restoring a document after deletion", async () => {
    const pendingList = deferred<LocalDocument[]>();
    listLocalDocuments.mockReturnValue(pendingList.promise);
    deleteLocalDocument.mockResolvedValue(document);
    const localDocuments = useLocalDocuments();

    const loading = localDocuments.ensureLoaded();
    const deleting = localDocuments.deleteDocument(document.id);
    pendingList.resolve([document]);
    await Promise.all([loading, deleting]);

    expect(deleteLocalDocument).toHaveBeenCalledOnce();
    expect(localDocuments.status.value).toBe("ready");
    expect(localDocuments.documents.value).toEqual([]);
  });
});
