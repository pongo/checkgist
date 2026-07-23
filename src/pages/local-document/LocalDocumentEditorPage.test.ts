import { flushPromises, mount } from "@vue/test-utils";
import { reactive } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LocalDocumentEditorPage from "./LocalDocumentEditorPage.vue";

const documentId = "11111111-1111-4111-8111-111111111111";
const getLocalDocument = vi.hoisted(() =>
  vi.fn<
    (id: string) => Promise<{
      id: string;
      title: string;
      content: string;
      createdAt: number;
      updatedAt: number;
    } | null>
  >(),
);
const saveDocument = vi.hoisted(() => vi.fn<(input: unknown) => Promise<unknown>>());
const deleteDocument = vi.hoisted(() => vi.fn<(id: string) => Promise<unknown>>());
const refreshBookmarks = vi.hoisted(() => vi.fn<() => Promise<void>>());
const invalidateBookmarks = vi.hoisted(() => vi.fn<() => void>());
const routerPush = vi.hoisted(() => vi.fn<() => Promise<void>>());
const routeLeaveGuard = vi.hoisted(() => ({ callback: undefined as (() => boolean) | undefined }));
const route = reactive({ params: { documentId } });

vi.mock("@/local-documents", () => ({
  getLocalDocument,
  isLocalDocumentId: () => true,
  LocalDocumentPreview: {
    name: "LocalDocumentPreview",
    props: ["content"],
    template: "<div data-preview>{{ content }}</div>",
  },
  localDocumentViewRoute: (id: string) => `/local/${id}`,
  useLocalDocuments: () => ({ saveDocument, deleteDocument }),
  validateLocalDocumentTitle: (title: string) => ({ valid: true, title }),
}));

vi.mock("@/bookmarks", () => ({
  useBookmarks: () => ({ refresh: refreshBookmarks, invalidate: invalidateBookmarks }),
}));

vi.mock("vue-router", () => ({
  RouterLink: {
    props: ["to", "target", "rel"],
    template: '<a :href="to" :target="target" :rel="rel"><slot /></a>',
  },
  onBeforeRouteLeave: (callback: () => boolean) => {
    routeLeaveGuard.callback = callback;
  },
  useRoute: () => route,
  useRouter: () => ({ push: routerPush }),
}));

async function mountEditor() {
  const wrapper = mount(LocalDocumentEditorPage, {
    global: {
      stubs: {
        LocalDocumentPreview: {
          props: ["content"],
          template: "<div data-preview>{{ content }}</div>",
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

function resetEditorMocks() {
  vi.restoreAllMocks();
  getLocalDocument.mockReset();
  saveDocument.mockReset();
  deleteDocument.mockReset();
  refreshBookmarks.mockReset();
  invalidateBookmarks.mockReset();
  routerPush.mockReset();
  routeLeaveGuard.callback = undefined;
  getLocalDocument.mockResolvedValue({
    id: documentId,
    title: "Packing",
    content: "- [ ] Passport",
    createdAt: 1,
    updatedAt: 1,
  });
}

beforeEach(resetEditorMocks);

describe("LocalDocumentEditorPage preview workspace", () => {
  it("switches the small-screen workspace between the editable draft and preview", async () => {
    const wrapper = await mountEditor();
    const previewToggle = wrapper.get("button[aria-pressed]");
    const textarea = wrapper.get("textarea[aria-label='Markdown content']");
    const previewPane = wrapper.get("[data-preview]").element.parentElement;

    expect(previewToggle.text()).toBe("Preview");
    expect(previewToggle.attributes("aria-pressed")).toBe("false");
    expect(textarea.classes()).toContain("block");
    expect(previewPane?.classList.contains("hidden")).toBe(true);

    await previewToggle.trigger("click");

    expect(previewToggle.attributes("aria-pressed")).toBe("true");
    expect(previewToggle.classes()).toContain("bg-zinc-100");
    expect(textarea.classes()).toContain("hidden");
    expect(previewPane?.classList.contains("block")).toBe(true);

    await previewToggle.trigger("click");

    expect(previewToggle.attributes("aria-pressed")).toBe("false");
    expect(textarea.classes()).toContain("block");
    expect(previewPane?.classList.contains("hidden")).toBe(true);
  });

  it("keeps equal independently scrolling editor and preview panes on wider screens", async () => {
    const wrapper = await mountEditor();
    const textarea = wrapper.get("textarea[aria-label='Markdown content']");
    const previewPane = wrapper.get("[data-preview]").element.parentElement;

    expect(wrapper.get("main").classes()).toEqual(
      expect.arrayContaining(["h-dvh", "overflow-hidden"]),
    );
    expect(textarea.classes()).toEqual(expect.arrayContaining(["h-full", "sm:w-1/2", "sm:block"]));
    expect(previewPane?.classList.contains("h-full")).toBe(true);
    expect(previewPane?.classList.contains("sm:w-1/2")).toBe(true);
    expect(previewPane?.classList.contains("overflow-hidden")).toBe(true);
  });
});

describe("LocalDocumentEditorPage save protection", () => {
  it("exposes Browse as an opener-protected saved-version link without saving the draft", async () => {
    const wrapper = await mountEditor();
    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [x] Passport");

    const browse = wrapper.get("a[aria-label='Browse']");
    expect(browse.attributes()).toMatchObject({
      href: `/local/${documentId}`,
      target: "_blank",
      rel: "noopener noreferrer",
    });
    await browse.trigger("click");

    expect(saveDocument).not.toHaveBeenCalled();
  });

  it("saves the dirty draft through Ctrl+S and Cmd+S and clears navigation protections", async () => {
    saveDocument.mockResolvedValue({
      id: documentId,
      title: "Packing",
      content: "- [x] Passport",
      createdAt: 1,
      updatedAt: 2,
    });

    const wrapper = await mountEditor();

    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [x] Passport");

    const saveShortcut = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      cancelable: true,
    });
    window.dispatchEvent(saveShortcut);
    await flushPromises();

    expect(saveShortcut.defaultPrevented).toBe(true);
    expect(saveDocument).toHaveBeenCalledWith({
      id: documentId,
      title: "Packing",
      content: "- [x] Passport",
    });
    expect(routeLeaveGuard.callback?.()).toBe(true);
    const unloadAfterSave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unloadAfterSave);
    expect(unloadAfterSave.defaultPrevented).toBe(false);

    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [ ] Passport again");
    saveDocument.mockResolvedValue({
      id: documentId,
      title: "Packing",
      content: "- [ ] Passport again",
      createdAt: 1,
      updatedAt: 3,
    });
    const commandSaveShortcut = new KeyboardEvent("keydown", {
      key: "s",
      metaKey: true,
      cancelable: true,
    });
    window.dispatchEvent(commandSaveShortcut);
    await flushPromises();

    expect(commandSaveShortcut.defaultPrevented).toBe(true);
    expect(saveDocument).toHaveBeenLastCalledWith({
      id: documentId,
      title: "Packing",
      content: "- [ ] Passport again",
    });
  });

  it("keeps dirty navigation and unload protection after a failed save", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    saveDocument.mockRejectedValue(new Error("Storage is unavailable."));
    const wrapper = await mountEditor();
    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [x] Passport");

    await wrapper.get("button[aria-label='Save']").trigger("click");
    await flushPromises();

    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);

    expect(wrapper.text()).toContain("Storage is unavailable.");
    expect(routeLeaveGuard.callback?.()).toBe(false);
    expect(unload.defaultPrevented).toBe(true);
  });
});

describe("LocalDocumentEditorPage deletion", () => {
  it("leaves the draft and route unchanged when deletion is canceled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = await mountEditor();
    await wrapper.get("input[id='local-document-title-desktop']").setValue("Draft title");

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");

    expect(window.confirm).toHaveBeenCalledWith("Delete “Draft title”? This cannot be undone.");
    expect(deleteDocument).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
    const titleInput = wrapper.get<HTMLInputElement>("input[id='local-document-title-desktop']");
    expect(titleInput.element.value).toBe("Draft title");
  });

  it("refreshes Bookmark state only after confirmed deletion and returns home", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteDocument.mockResolvedValue({ id: documentId });
    refreshBookmarks.mockResolvedValue(undefined);
    routerPush.mockResolvedValue(undefined);
    const wrapper = await mountEditor();

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(deleteDocument).toHaveBeenCalledWith(documentId);
    expect(refreshBookmarks).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledWith("/");
  });

  it("returns home after a committed deletion even when Bookmark cache refresh fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteDocument.mockResolvedValue({ id: documentId });
    refreshBookmarks.mockRejectedValue(new Error("Storage is unavailable."));
    routerPush.mockResolvedValue(undefined);
    const wrapper = await mountEditor();

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(invalidateBookmarks).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledWith("/");
  });

  it("keeps the editor draft and reports an error when deletion fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteDocument.mockRejectedValue(new Error("Storage is unavailable."));
    const wrapper = await mountEditor();
    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [x] Passport");

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Storage is unavailable.");
    const contentTextarea = wrapper.get<HTMLTextAreaElement>(
      "textarea[aria-label='Markdown content']",
    );
    expect(contentTextarea.element.value).toBe("- [x] Passport");
    expect(routerPush).not.toHaveBeenCalled();
  });
});
