import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalDocument } from "./db";
import { resetLocalDocumentsForTests, useLocalDocuments } from "./useLocalDocuments";

const listLocalDocuments = vi.hoisted(() => vi.fn<() => Promise<LocalDocument[]>>());
const deleteLocalDocument = vi.hoisted(() =>
  vi.fn<(id: string) => Promise<LocalDocument | null>>(),
);
const saveLocalDocument = vi.hoisted(() =>
  vi.fn<(input: { id: string; title: string; content: string }) => Promise<LocalDocument | null>>(),
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
  saveLocalDocument,
}));

const document: LocalDocument = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Packing",
  content: "- [ ] Passport",
  createdAt: 1,
  updatedAt: 1,
};

const secondDocument: LocalDocument = {
  ...document,
  id: "22222222-2222-4222-8222-222222222222",
  title: "Tickets",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitForInitialLoad(localDocuments: ReturnType<typeof useLocalDocuments>) {
  await vi.waitFor(() => expect(localDocuments.status.value).not.toBe("loading"));
}

beforeEach(async () => {
  await resetLocalDocumentsForTests();
  listLocalDocuments.mockReset();
  listLocalDocuments.mockResolvedValue([]);
  deleteLocalDocument.mockReset();
  saveLocalDocument.mockReset();
  removeBookmark.mockReset();
  removeBookmark.mockResolvedValue(null);
  invalidateBookmarks.mockReset();
});

describe("useLocalDocuments snapshots", () => {
  it("keeps document snapshots local to each composable instance", async () => {
    listLocalDocuments.mockResolvedValueOnce([document]).mockResolvedValueOnce([]);
    const first = useLocalDocuments();
    await waitForInitialLoad(first);

    const second = useLocalDocuments();
    expect(second.documents.value).toEqual([]);

    await waitForInitialLoad(second);

    expect(first.documents.value).toEqual([document]);
    expect(second.documents.value).toEqual([]);
  });

  it("starts loading its snapshot immediately", () => {
    const localDocuments = useLocalDocuments();

    expect(localDocuments.status.value).toBe("loading");
    expect(localDocuments.isReady.value).toBe(false);
  });

  it("retries a failed load and exposes its error state", async () => {
    const loadError = new Error("Storage is unavailable.");
    listLocalDocuments.mockRejectedValueOnce(loadError).mockResolvedValueOnce([document]);
    const localDocuments = useLocalDocuments();

    await waitForInitialLoad(localDocuments);

    expect(localDocuments.status.value).toBe("error");
    expect(localDocuments.error.value).toBe(loadError);

    await localDocuments.refresh();

    expect(listLocalDocuments).toHaveBeenCalledTimes(2);
    expect(localDocuments.status.value).toBe("ready");
    expect(localDocuments.error.value).toBeNull();
    expect(localDocuments.documents.value).toEqual([document]);
  });
});

describe("useLocalDocuments saving", () => {
  const input = { id: document.id, title: "Packing", content: "- [x] Passport" };

  it("refreshes a loaded snapshot after a successful save", async () => {
    const saved = { ...document, content: input.content, updatedAt: 2 };
    listLocalDocuments.mockResolvedValueOnce([document]).mockResolvedValueOnce([saved]);
    saveLocalDocument.mockResolvedValue(saved);
    const localDocuments = useLocalDocuments();
    await waitForInitialLoad(localDocuments);

    await expect(localDocuments.saveDocument(input)).resolves.toEqual(saved);

    expect(localDocuments.documents.value).toEqual([saved]);
  });

  it("does not replace a loaded snapshot when saving a missing document", async () => {
    listLocalDocuments.mockResolvedValueOnce([document]).mockResolvedValueOnce([]);
    saveLocalDocument.mockResolvedValue(null);
    const localDocuments = useLocalDocuments();
    await waitForInitialLoad(localDocuments);

    await expect(localDocuments.saveDocument(input)).resolves.toBeNull();

    expect(localDocuments.documents.value).toEqual([document]);
  });
});

describe("useLocalDocuments mutation ordering", () => {
  it("prevents an earlier refresh from restoring a document after deletion", async () => {
    const pendingList = deferred<LocalDocument[]>();
    listLocalDocuments.mockReturnValue(pendingList.promise);
    deleteLocalDocument.mockResolvedValue(document);
    const localDocuments = useLocalDocuments();

    const deleting = localDocuments.deleteDocument(document.id);
    pendingList.resolve([document]);
    await deleting;

    expect(deleteLocalDocument).toHaveBeenCalledOnce();
    expect(localDocuments.status.value).toBe("ready");
    expect(localDocuments.documents.value).toEqual([]);
  });
});

describe("useLocalDocuments deletion", () => {
  it("removes only the deleted Local Document from a loaded snapshot", async () => {
    listLocalDocuments.mockResolvedValue([document, secondDocument]);
    deleteLocalDocument.mockResolvedValue(document);
    const localDocuments = useLocalDocuments();
    await waitForInitialLoad(localDocuments);

    await expect(localDocuments.deleteDocument(document.id)).resolves.toBe(document);

    expect(localDocuments.documents.value).toEqual([secondDocument]);
  });

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
