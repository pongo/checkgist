import "fake-indexeddb/auto";

import { flushPromises, mount } from "@vue/test-utils";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeCheckgistDatabaseForTests } from "@/database/checkgistDatabase";

import LocalDocumentList from "./LocalDocumentList.vue";
import { resetLocalDocumentsForTests } from "./useLocalDocuments";

const push = vi.hoisted(() => vi.fn<(path: string) => Promise<void>>());
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
    vi.stubGlobal("crypto", { randomUUID: () => documentId });
  });

  afterEach(async () => {
    await resetLocalDocumentsForTests();
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
});
