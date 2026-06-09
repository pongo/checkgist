import "fake-indexeddb/auto";

import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { IDBFactory } from "fake-indexeddb";
import { defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeBookmarkDatabaseForTests } from "./db";
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
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  });
}

function getButtonByLabel(wrapper: VueWrapper, label: string) {
  return wrapper.get(`button[aria-label='${label}']`);
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
    wrapper = mountBookmarkList();

    const link = wrapper.get("a[href='/pastebin.com/one']");
    expect(link.text()).toBe("One");
  });

  it("renames a bookmark with Enter and trims whitespace", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    wrapper = mountBookmarkList();

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
    wrapper = mountBookmarkList();

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
    wrapper = mountBookmarkList();

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
    wrapper = mountBookmarkList();

    await getButtonByLabel(wrapper, "Delete bookmark").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.find("a[href='/pastebin.com/one']").exists()).toBe(false);
      expect(wrapper?.text()).toContain("One");
      expect(wrapper?.text()).toContain("Restore");
      expect(bookmarks.bookmarks.value).toEqual([]);
    });
  });

  it("restores a deleted bookmark at its placeholder position", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = mountBookmarkList();

    await wrapper.get("button[aria-label='Delete bookmark']").trigger("click");
    await vi.waitFor(() => {
      expect(wrapper?.text()).toContain("Restore");
    });
    await wrapper.get("button:not([aria-label])").trigger("click");

    await vi.waitFor(() => {
      expect(bookmarks.bookmarks.value).toEqual([
        { routePath: "/pastebin.com/one", title: "One", position: 0 },
        { routePath: "/pastebin.com/two", title: "Two", position: 1 },
      ]);
    });
  });

  it("reorders bookmarks with native drag events on the title link", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/one", title: "One" });
    await bookmarks.addBookmark({ routePath: "/pastebin.com/two", title: "Two" });
    wrapper = mountBookmarkList();
    const dataTransfer = {
      dropEffect: "",
      effectAllowed: "",
      getData: vi.fn<(format: string) => string>(() => "/pastebin.com/two"),
      setData: vi.fn<(format: string, data: string) => void>(),
    };

    await wrapper.get("a[href='/pastebin.com/two']").trigger("dragstart", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("dragover", { dataTransfer });
    await wrapper.get("a[href='/pastebin.com/one']").trigger("drop", { dataTransfer });

    await vi.waitFor(() => {
      expect(bookmarks.bookmarks.value).toEqual([
        { routePath: "/pastebin.com/two", title: "Two", position: 0 },
        { routePath: "/pastebin.com/one", title: "One", position: 1 },
      ]);
    });
  });
});
