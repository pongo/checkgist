import "fake-indexeddb/auto";

import { flushPromises, mount } from "@vue/test-utils";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";

import LocalDocumentList from "./LocalDocumentList.vue";
import { deleteLocalDocument } from "./db";
import { resetLocalDocumentsForTests } from "./useLocalDocuments";

const push = vi.hoisted(() => vi.fn<(path: string) => Promise<void>>());
const removeBookmark = vi.hoisted(() => vi.fn<(routePath: string) => Promise<unknown>>());
const invalidateBookmarks = vi.hoisted(() => vi.fn<() => void>());
const documentId = "11111111-1111-4111-8111-111111111111";
const mountOptions = {
  global: {
    stubs: {
      RouterLink: {
        props: ["to"],
        template: '<a :href="to"><slot /></a>',
      },
    },
  },
} as const;

vi.mock("vue-router", () => ({
  RouterLink: {
    props: ["to"],
    template: '<a :href="to"><slot /></a>',
  },
  useRouter: () => ({ push }),
}));

vi.mock("@/bookmarks", () => ({
  useBookmarks: () => ({ removeBookmark, invalidate: invalidateBookmarks }),
}));

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

describe("LocalDocumentList", () => {
  beforeEach(async () => {
    await resetLocalDocumentsForTests();
    await closeCheckgistDatabaseForTests();
    resetIndexedDb();
    push.mockReset();
    push.mockResolvedValue(undefined);
    removeBookmark.mockReset();
    removeBookmark.mockResolvedValue(null);
    invalidateBookmarks.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => documentId });
  });

  afterEach(async () => {
    await resetLocalDocumentsForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the always-visible empty state and persists before navigating to the editor", async () => {
    const wrapper = mount(LocalDocumentList, mountOptions);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));

    expect(wrapper.text()).toContain("Local documents");
    expect(wrapper.text()).toContain("No local documents yet");

    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(push).toHaveBeenCalled());

    expect(push).toHaveBeenCalledWith(`/local/${documentId}/edit`);
    expect(wrapper.text()).toContain("Untitled document");
  });

  it("keeps the user on the list and shows an error when creation fails", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const wrapper = mount(LocalDocumentList, mountOptions);
    await flushPromises();

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(push).not.toHaveBeenCalled();
    expect(wrapper.get("[role='alert']").text()).not.toBe("");
  });

  it("links each document action to its editor", async () => {
    const wrapper = mount(LocalDocumentList, mountOptions);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Untitled document"));

    expect(wrapper.get("a[aria-label='Edit Local Document']").attributes("href")).toBe(
      `/local/${documentId}/edit`,
    );
  });

  it("keeps the document when deletion is canceled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = mount(LocalDocumentList, mountOptions);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Untitled document"));

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete “Untitled document”? This cannot be undone.",
    );
    expect(wrapper.text()).toContain("Untitled document");
    expect(removeBookmark).not.toHaveBeenCalled();
  });

  it("removes a confirmed document and its Bookmark", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mount(LocalDocumentList, mountOptions);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Untitled document"));

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));

    expect(removeBookmark).toHaveBeenCalledWith(`/local/${documentId}`);
    expect(invalidateBookmarks).not.toHaveBeenCalled();
  });

  it("invalidates Bookmark state when Bookmark removal fails after a committed deletion", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    removeBookmark.mockRejectedValue(new Error("Storage is unavailable."));
    const wrapper = mount(LocalDocumentList, mountOptions);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Untitled document"));

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await vi.waitFor(() => expect(invalidateBookmarks).toHaveBeenCalledOnce());

    expect(wrapper.text()).toContain("No local documents yet");
  });

  it("refreshes stale state when the document was already deleted", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mount(LocalDocumentList, mountOptions);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Untitled document"));
    await deleteLocalDocument(documentId);

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));

    expect(removeBookmark).not.toHaveBeenCalled();
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("keeps the document and reports a storage failure when deletion does not commit", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mount(LocalDocumentList, mountOptions);
    await vi.waitFor(() => expect(wrapper.text()).toContain("No local documents yet"));
    await wrapper.get("button").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("Untitled document"));
    await closeCheckgistDatabaseForTests();
    vi.stubGlobal("indexedDB", undefined);

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Untitled document");
    expect(wrapper.get("[role='alert']").text()).not.toBe("");
    expect(removeBookmark).not.toHaveBeenCalled();
  });
});
