import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalDocument } from "./db";
import { resetLocalDocumentsForTests, useLocalDocuments } from "./useLocalDocuments";

const listLocalDocuments = vi.hoisted(() => vi.fn<() => Promise<LocalDocument[]>>());
const deleteLocalDocument = vi.hoisted(() =>
  vi.fn<(id: string) => Promise<LocalDocument | null>>(),
);
const removeBookmark = vi.hoisted(() => vi.fn<(routePath: string) => Promise<unknown>>());
const invalidateBookmarks = vi.hoisted(() => vi.fn<() => void>());

vi.mock("@/bookmarks", () => ({
  useBookmarks: () => ({ removeBookmark, invalidate: invalidateBookmarks }),
}));

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
  removeBookmark.mockReset();
  removeBookmark.mockResolvedValue(null);
  invalidateBookmarks.mockReset();
});

describe("useLocalDocuments snapshots", () => {
  it("keeps document snapshots local to each composable instance", async () => {
    listLocalDocuments.mockResolvedValueOnce([document]).mockResolvedValueOnce([]);
    const first = useLocalDocuments();
    await first.ensureLoaded();

    const second = useLocalDocuments();
    expect(second.documents.value).toEqual([]);

    await second.ensureLoaded();

    expect(first.documents.value).toEqual([document]);
    expect(second.documents.value).toEqual([]);
  });
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

describe("useLocalDocuments deletion", () => {
  it("removes the owned Bookmark after deleting a Local Document", async () => {
    deleteLocalDocument.mockResolvedValue(document);

    const deleted = await useLocalDocuments().deleteDocument(document.id);

    expect(deleted).toBe(document);
    expect(removeBookmark).toHaveBeenCalledWith(`/local/${document.id}`);
    expect(invalidateBookmarks).not.toHaveBeenCalled();
  });

  it("does not remove a Bookmark when the Local Document no longer exists", async () => {
    deleteLocalDocument.mockResolvedValue(null);

    const deleted = await useLocalDocuments().deleteDocument(document.id);

    expect(deleted).toBeNull();
    expect(removeBookmark).not.toHaveBeenCalled();
  });

  it("invalidates Bookmark state when cleanup fails after deletion", async () => {
    deleteLocalDocument.mockResolvedValue(document);
    removeBookmark.mockRejectedValue(new Error("Storage is unavailable."));

    await expect(useLocalDocuments().deleteDocument(document.id)).resolves.toBe(document);

    expect(invalidateBookmarks).toHaveBeenCalledOnce();
  });

  it("preserves the Bookmark when Local Document deletion fails", async () => {
    deleteLocalDocument.mockRejectedValue(new Error("Storage is unavailable."));

    await expect(useLocalDocuments().deleteDocument(document.id)).rejects.toThrow(
      "Storage is unavailable.",
    );

    expect(removeBookmark).not.toHaveBeenCalled();
  });
});
