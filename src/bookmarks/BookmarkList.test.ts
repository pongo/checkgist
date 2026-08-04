import "fake-indexeddb/auto";

import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { IDBFactory } from "fake-indexeddb";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeBookmarkDatabaseForTests, listBookmarks, type Bookmark } from "./db";
import BookmarkList from "./BookmarkList.vue";
import { resetBookmarksForTests, useBookmarks } from "./useBookmarks";

const RouterLinkStub = defineComponent({
  props: {
    to: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "a",
        {
          href: props.to,
          ...attrs,
        },
        slots.default?.(),
      );
  },
});

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

function mountBookmarkList() {
  return mount(BookmarkList, {
    attachTo: document.body,
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  });
}

async function mountLoadedBookmarkList() {
  const wrapper = mountBookmarkList();
  await vi.waitFor(() => expect(wrapper.find("section").exists()).toBe(true));
  return wrapper;
}

async function expectPersistedBookmarks(expected: Bookmark[]) {
  await vi.waitFor(async () => {
    expect(await listBookmarks()).toEqual(expected);
  });
}

function getButtonByLabel(wrapper: VueWrapper, label: string) {
  return wrapper.get(`button[aria-label='${label}']`);
}

function setElementBounds(element: Element, bounds: Partial<DOMRect>) {
  element.getBoundingClientRect = vi.fn<() => DOMRect>(
    () =>
      ({
        bottom: 24,
        height: 24,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
        ...bounds,
      }) as DOMRect,
  );
}

type TestDataTransfer = Pick<DataTransfer, "dropEffect" | "effectAllowed" | "getData" | "setData">;

function dispatchWindowDragEvent(type: string, dataTransfer: TestDataTransfer) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: dataTransfer,
  });

  window.dispatchEvent(event);
  return event;
}

function dispatchElementDragEvent(element: Element, type: string, dataTransfer: TestDataTransfer) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: dataTransfer,
  });

  element.dispatchEvent(event);
  return event;
}

describe("BookmarkList", () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(async () => {
    await resetBookmarksForTests();
    await closeBookmarkDatabaseForTests();
    resetIndexedDb();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("is hidden until there are bookmarks", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.ensureLoaded();
    wrapper = mountBookmarkList();

    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("renders bookmark links", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = await mountLoadedBookmarkList();

    const link = wrapper.get("a[href='/pastebin.com/one']");
    expect(link.text()).toBe("One");
  });

  it("renames a bookmark with Enter and trims whitespace", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = await mountLoadedBookmarkList();

    await getButtonByLabel(wrapper, "Rename bookmark").trigger("click");
    await wrapper.get("input").setValue("  Release checklist  ");
    await wrapper.get("input").trigger("keydown", { key: "Enter" });

    await vi.waitFor(() => {
      expect(wrapper?.get("a[href='/pastebin.com/one']").text()).toBe("Release checklist");
    });
  });

  it("cancels rename with Escape", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = await mountLoadedBookmarkList();

    await getButtonByLabel(wrapper, "Rename bookmark").trigger("click");
    await wrapper.get("input").setValue("Ignored");
    await wrapper.get("input").trigger("keydown", { key: "Escape" });

    await vi.waitFor(() => {
      expect(wrapper?.get("a[href='/pastebin.com/one']").text()).toBe("One");
    });
  });

  it("keeps the previous title when blur saves an empty title", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = await mountLoadedBookmarkList();

    await getButtonByLabel(wrapper, "Rename bookmark").trigger("click");
    await wrapper.get("input").setValue("  ");
    await wrapper.get("input").trigger("blur");

    await vi.waitFor(() => {
      expect(wrapper?.get("a[href='/pastebin.com/one']").text()).toBe("One");
    });
  });

  it("shows a restore placeholder after deleting a bookmark", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = await mountLoadedBookmarkList();

    await getButtonByLabel(wrapper, "Delete bookmark").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.find("a[href='/pastebin.com/one']").exists()).toBe(false);
      expect(wrapper?.text()).toContain("One");
      expect(wrapper?.text()).toContain("Restore");
    });
    await expectPersistedBookmarks([]);
  });

  it("restores a deleted bookmark at its placeholder position", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = await mountLoadedBookmarkList();

    await wrapper.get("button[aria-label='Delete bookmark']").trigger("click");
    await vi.waitFor(() => {
      expect(wrapper?.text()).toContain("Restore");
    });
    await wrapper.get("button:not([aria-label])").trigger("click");

    await expectPersistedBookmarks([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
    ]);
  });

  it("reorders bookmarks with native drag events on the title link", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/two"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragover", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("drop", { dataTransfer });

    await expectPersistedBookmarks([
      { routePath: "/pastebin.com/two", title: "Two", position: 0 },
      { routePath: "/pastebin.com/one", title: "One", position: 1 },
    ]);
  });

  it("shows a drop indicator while dragging over another bookmark", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/two"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragover", { dataTransfer });

    expect(wrapper.get("a[href='/pastebin.com/one']").element.closest("li")?.className).toContain(
      "before:bg-blue-600",
    );
  });

  it("clears a pending reorder when a bookmark drag ends", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/two"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragover", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragend");

    expect(
      wrapper.get("a[href='/pastebin.com/one']").element.closest("li")?.className,
    ).not.toContain("before:bg-blue-600");
    await expectPersistedBookmarks([
      { routePath: "/pastebin.com/one", title: "One", position: 0 },
      { routePath: "/pastebin.com/two", title: "Two", position: 1 },
    ]);
  });

  it("does not accept drops on removed bookmark placeholders", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/three", title: "Three" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/two"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await getButtonByLabel(wrapper, "Delete bookmark").trigger("click");
    await vi.waitFor(() => {
      expect(wrapper?.text()).toContain("Restore");
    });
    const removedRow = wrapper.findAll("li").find((row) => row.text().includes("Restore"));

    if (removedRow === undefined) {
      throw new Error("Expected a removed bookmark placeholder.");
    }

    await wrapper.get("a[href='/pastebin.com/three']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragover", { dataTransfer });
    const dragOverEvent = dispatchElementDragEvent(removedRow.element, "dragover", dataTransfer);
    const dropEvent = dispatchElementDragEvent(removedRow.element, "drop", dataTransfer);

    expect(dragOverEvent.defaultPrevented).toBe(false);
    expect(dropEvent.defaultPrevented).toBe(false);
    await expectPersistedBookmarks([
      { routePath: "/pastebin.com/two", title: "Two", position: 0 },
      { routePath: "/pastebin.com/three", title: "Three", position: 1 },
    ]);
  });

  it("allows dropping outside the list after a drop indicator is selected", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/two"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragover", { dataTransfer });
    const dragOverEvent = dispatchWindowDragEvent("dragover", dataTransfer);
    dispatchWindowDragEvent("drop", dataTransfer);

    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("move");
    await expectPersistedBookmarks([
      { routePath: "/pastebin.com/two", title: "Two", position: 0 },
      { routePath: "/pastebin.com/one", title: "One", position: 1 },
    ]);
  });

  it("does not take ownership of a document drag before a drop target is selected", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/one"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    const dragOverEvent = dispatchWindowDragEvent("dragover", dataTransfer);

    expect(dragOverEvent.defaultPrevented).toBe(false);
    expect(dataTransfer.dropEffect).toBe("none");
  });

  it("allows internal bookmark dragenter over the list before an indicator is selected", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/one"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragstart", { dataTransfer });
    await wrapper.get("ul").trigger("dragenter", { dataTransfer });

    expect(dataTransfer.dropEffect).toBe("move");
  });

  it("does not accept a boundary drag before a bookmark is identified", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/one"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    const dragEnterEvent = dispatchElementDragEvent(
      wrapper.get("ul").element,
      "dragenter",
      dataTransfer,
    );

    expect(dragEnterEvent.defaultPrevented).toBe(false);
    expect(dataTransfer.dropEffect).toBe("none");
  });

  it("drops before the target bookmark when dragging downward", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/three", title: "Three" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer = {
      dropEffect: "",
      effectAllowed: "",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/one"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/three']").trigger("dragover", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/three']").trigger("drop", { dataTransfer });

    await expectPersistedBookmarks([
      { routePath: "/pastebin.com/two", title: "Two", position: 0 },
      { routePath: "/pastebin.com/one", title: "One", position: 1 },
      { routePath: "/pastebin.com/three", title: "Three", position: 2 },
    ]);
  });

  it("keeps one visual drop indicator for the same downward insertion gap", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/three", title: "Three" });
    wrapper = await mountLoadedBookmarkList();
    const dataTransfer: TestDataTransfer = {
      dropEffect: "none",
      effectAllowed: "move",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/one"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };
    const twoRow = wrapper.get("a[href='/pastebin.com/two']").element.closest("li");
    const threeRow = wrapper.get("a[href='/pastebin.com/three']").element.closest("li");

    if (twoRow === null || threeRow === null) {
      throw new Error("Expected bookmark rows to exist");
    }

    setElementBounds(twoRow, { bottom: 48, top: 24 });
    setElementBounds(threeRow, { bottom: 72, top: 48 });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragover", {
      clientY: 43,
      dataTransfer,
    });

    expect(threeRow.className).toContain("before:bg-blue-600");
    expect(twoRow.className).not.toContain("after:bg-blue-600");

    await wrapper.get("a[href='/pastebin.com/three']").trigger("dragover", {
      clientY: 53,
      dataTransfer,
    });

    expect(threeRow.className).toContain("before:bg-blue-600");
    expect(twoRow.className).not.toContain("after:bg-blue-600");
  });
});
