import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, reactive, type Ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LocalDocumentEditorPage from "./LocalDocumentEditorPage.vue";

const documentId = "11111111-1111-4111-8111-111111111111";
type EditorState = "loading" | "ready" | "missing" | "error";
type TitleValidation = { valid: true; title: string } | { valid: false; message: string };
type EditorFixture = {
  title: Ref<string>;
  content: Ref<string>;
  state: Ref<EditorState>;
  error: Ref<string>;
  isSaving: Ref<boolean>;
  isDeleting: Ref<boolean>;
  titleValidation: Ref<TitleValidation>;
  isDirty: Ref<boolean>;
  canSave: Ref<boolean>;
  canDelete: Ref<boolean>;
  save: ReturnType<typeof vi.fn<() => Promise<unknown>>>;
  deleteDocument: ReturnType<typeof vi.fn<() => Promise<unknown>>>;
};

const save = vi.hoisted(() => vi.fn<() => Promise<unknown>>());
const deleteDocument = vi.hoisted(() => vi.fn<() => Promise<unknown>>());
const routerPush = vi.hoisted(() => vi.fn<() => Promise<void>>());
const routeLeaveGuard = vi.hoisted(() => ({ callback: undefined as (() => boolean) | undefined }));
const editorFixture = vi.hoisted(() => ({ current: undefined as unknown as EditorFixture }));
const route = reactive({ params: { documentId } });

vi.mock("@/local-documents", async () => {
  const { ref } = await import("vue");

  const title = ref("Packing");
  editorFixture.current = {
    title,
    content: ref("- [ ] Passport"),
    state: ref<EditorState>("ready"),
    error: ref(""),
    isSaving: ref(false),
    isDeleting: ref(false),
    titleValidation: ref<TitleValidation>({ valid: true, title: "Packing" }),
    isDirty: ref(false),
    canSave: ref(false),
    canDelete: ref(true),
    save,
    deleteDocument,
  };

  return {
    localDocumentViewRoute: (id: string) => `/local/${id}`,
    useLocalDocumentEditor: () => editorFixture.current,
  };
});

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
  editorFixture.current.title.value = "Packing";
  editorFixture.current.content.value = "- [ ] Passport";
  editorFixture.current.state.value = "ready";
  editorFixture.current.error.value = "";
  editorFixture.current.isSaving.value = false;
  editorFixture.current.isDeleting.value = false;
  editorFixture.current.titleValidation.value = { valid: true, title: "Packing" };
  editorFixture.current.isDirty.value = false;
  editorFixture.current.canSave.value = false;
  editorFixture.current.canDelete.value = true;
  save.mockReset();
  deleteDocument.mockReset();
  routerPush.mockReset();
  routeLeaveGuard.callback = undefined;
}

beforeEach(resetEditorMocks);

describe("LocalDocumentEditorPage preview workspace", () => {
  it("renders no transient feedback while the Local Document is loading", async () => {
    editorFixture.current.state.value = "loading";

    const wrapper = await mountEditor();

    expect(wrapper.text()).not.toContain("Loading Local Document");
    expect(wrapper.find("textarea[aria-label='Markdown content']").exists()).toBe(false);
    expect(wrapper.get("main").text()).toBe("");
  });

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

    expect(save).not.toHaveBeenCalled();
  });

  it("saves the dirty draft through Ctrl+S and Cmd+S and clears navigation protections", async () => {
    save.mockResolvedValue({ id: documentId });

    const wrapper = await mountEditor();

    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [x] Passport");
    editorFixture.current.isDirty.value = true;
    editorFixture.current.canSave.value = true;

    const saveShortcut = new KeyboardEvent("keydown", {
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      cancelable: true,
    });
    window.dispatchEvent(saveShortcut);
    await flushPromises();

    expect(saveShortcut.defaultPrevented).toBe(true);
    expect(save).toHaveBeenCalledWith();
    editorFixture.current.isDirty.value = false;
    editorFixture.current.canSave.value = false;
    await nextTick();
    expect(routeLeaveGuard.callback?.()).toBe(true);
    const unloadAfterSave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unloadAfterSave);
    expect(unloadAfterSave.defaultPrevented).toBe(false);

    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [ ] Passport again");
    editorFixture.current.isDirty.value = true;
    editorFixture.current.canSave.value = true;
    const commandSaveShortcut = new KeyboardEvent("keydown", {
      key: "s",
      code: "KeyS",
      metaKey: true,
      cancelable: true,
    });
    window.dispatchEvent(commandSaveShortcut);
    await flushPromises();

    expect(commandSaveShortcut.defaultPrevented).toBe(true);
    expect(save).toHaveBeenLastCalledWith();
  });

  it("keeps dirty navigation and unload protection after a failed save", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    save.mockRejectedValue(new Error("Storage is unavailable."));
    const wrapper = await mountEditor();
    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [x] Passport");
    editorFixture.current.isDirty.value = true;
    editorFixture.current.canSave.value = true;
    await nextTick();

    await wrapper.get("button[aria-label='Save']").trigger("click");
    editorFixture.current.error.value = "Storage is unavailable.";
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

  it("deletes the confirmed document and returns home", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteDocument.mockResolvedValue({ id: documentId });
    routerPush.mockResolvedValue(undefined);
    const wrapper = await mountEditor();

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(deleteDocument).toHaveBeenCalledWith();
    expect(routerPush).toHaveBeenCalledWith("/");
  });

  it("keeps the current route when the Local Document no longer exists", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteDocument.mockResolvedValue(null);
    const wrapper = await mountEditor();

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(deleteDocument).toHaveBeenCalledWith();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("keeps the editor draft and reports an error when deletion fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteDocument.mockRejectedValue(new Error("Storage is unavailable."));
    const wrapper = await mountEditor();
    await wrapper.get("textarea[aria-label='Markdown content']").setValue("- [x] Passport");

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    editorFixture.current.error.value = "Storage is unavailable.";
    await flushPromises();

    expect(wrapper.text()).toContain("Storage is unavailable.");
    const contentTextarea = wrapper.get<HTMLTextAreaElement>(
      "textarea[aria-label='Markdown content']",
    );
    expect(contentTextarea.element.value).toBe("- [x] Passport");
    expect(routerPush).not.toHaveBeenCalled();
  });
});
