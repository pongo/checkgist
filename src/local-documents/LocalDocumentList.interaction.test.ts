import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalDocument } from "./types";

const push = vi.hoisted(() => vi.fn<(path: string) => Promise<void>>());
const localDocuments = vi.hoisted(() => ({ value: undefined as unknown }));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("./useLocalDocuments", () => ({
  useLocalDocuments: () => localDocuments.value,
}));

import LocalDocumentList from "./LocalDocumentList.vue";

const documentId = "11111111-1111-4111-8111-111111111111";
const document: LocalDocument = {
  id: documentId,
  title: "Project notes",
  content: "",
  createdAt: 0,
  updatedAt: 0,
};
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("LocalDocumentList interactions", () => {
  const documents = ref<LocalDocument[]>([]);
  const error = ref<unknown>(null);
  const isReady = ref(true);
  const refresh = vi.fn<() => Promise<void>>();
  const createDocument = vi.fn<() => Promise<LocalDocument>>();
  const deleteDocument = vi.fn<(id: string) => Promise<LocalDocument | null>>();

  beforeEach(() => {
    documents.value = [];
    error.value = null;
    isReady.value = true;
    refresh.mockReset();
    refresh.mockResolvedValue(undefined);
    createDocument.mockReset();
    deleteDocument.mockReset();
    push.mockReset();
    push.mockResolvedValue(undefined);
    localDocuments.value = {
      documents,
      error,
      isReady,
      refresh,
      createDocument,
      deleteDocument,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts ready for a new Local Document without a failure state", () => {
    const wrapper = mount(LocalDocumentList, mountOptions);

    expect(wrapper.get("button").attributes("disabled")).toBeUndefined();
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("creates only one Local Document while creation is pending", async () => {
    const creating = deferred<LocalDocument>();
    createDocument.mockReturnValue(creating.promise);
    const wrapper = mount(LocalDocumentList, mountOptions);

    const button = wrapper.get("button");
    button.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    button.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();

    expect(createDocument).toHaveBeenCalledTimes(1);

    creating.resolve(document);
    await flushPromises();

    expect(push).toHaveBeenCalledWith(`/local/${documentId}/edit`);
  });

  it("shows a creation failure and lets the user retry", async () => {
    createDocument.mockRejectedValueOnce(new Error("Storage is unavailable."));
    createDocument.mockResolvedValueOnce(document);
    const wrapper = mount(LocalDocumentList, mountOptions);

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.get("[role='alert']").text()).toContain("Storage is unavailable.");
    expect(wrapper.get("button").attributes("disabled")).toBeUndefined();

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(createDocument).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith(`/local/${documentId}/edit`);
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("uses a fallback message for a non-Error creation failure", async () => {
    createDocument.mockRejectedValue("quota exceeded");
    const wrapper = mount(LocalDocumentList, mountOptions);

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(wrapper.get("[role='alert']").text()).toBe("Failed to create Local Document.");
  });

  it("does not delete a Local Document when confirmation is canceled", async () => {
    documents.value = [document];
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = mount(LocalDocumentList, mountOptions);

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");

    expect(deleteDocument).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Project notes");
  });

  it("keeps a committed deletion successful when no stale-state refresh is needed", async () => {
    documents.value = [document];
    deleteDocument.mockImplementation(async () => {
      documents.value = [];
      return document;
    });
    refresh.mockRejectedValue(new Error("Storage became unavailable."));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mount(LocalDocumentList, mountOptions);

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("No local documents yet");
    expect(wrapper.find("[role='alert']").exists()).toBe(false);
  });

  it("uses a fallback message for a non-Error deletion failure", async () => {
    documents.value = [document];
    deleteDocument.mockRejectedValue("quota exceeded");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = mount(LocalDocumentList, mountOptions);

    await wrapper.get("button[aria-label='Delete Local Document']").trigger("click");
    await flushPromises();

    expect(wrapper.get("[role='alert']").text()).toBe("Failed to delete Local Document.");
  });
});
