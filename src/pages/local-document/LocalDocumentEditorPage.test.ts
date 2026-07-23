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
const routerPush = vi.hoisted(() => vi.fn<() => Promise<void>>());
const route = reactive({ params: { documentId } });

vi.mock("@/local-documents", () => ({
  getLocalDocument,
  isLocalDocumentId: () => true,
  localDocumentViewRoute: (id: string) => `/local/${id}`,
  useLocalDocuments: () => ({ saveDocument, deleteDocument }),
  validateLocalDocumentTitle: (title: string) => ({ valid: true, title }),
}));

vi.mock("@/bookmarks", () => ({
  useBookmarks: () => ({ refresh: refreshBookmarks }),
}));

vi.mock("vue-router", () => ({
  RouterLink: {
    props: ["to"],
    template: '<a :href="to"><slot /></a>',
  },
  onBeforeRouteLeave: () => undefined,
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

describe("LocalDocumentEditorPage preview workspace", () => {
  beforeEach(() => {
    getLocalDocument.mockReset();
    saveDocument.mockReset();
    deleteDocument.mockReset();
    refreshBookmarks.mockReset();
    routerPush.mockReset();
    getLocalDocument.mockResolvedValue({
      id: documentId,
      title: "Packing",
      content: "# Unsaved preview",
      createdAt: 1,
      updatedAt: 1,
    });
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
