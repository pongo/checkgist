import "fake-indexeddb/auto";

import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { IDBFactory } from "fake-indexeddb";
import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChecklistSession } from "@/checklist-session/types";

import { closeBookmarkDatabaseForTests } from "./db";
import BookmarkToggleButton from "./BookmarkToggleButton.vue";
import { resetBookmarksForTests, useBookmarks } from "./useBookmarks";

const route = reactive({
  path: "/pastebin.com/HdpnureE",
});

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

function createSession(title = "HdpnureE"): ChecklistSession {
  return {
    source: {
      reference: { type: "pastebin", pasteId: "HdpnureE" },
      metadata: {
        title,
        url: "https://pastebin.com/HdpnureE",
      },
      files: [],
    },
    files: [],
    hasTaskItems: false,
  };
}

describe("BookmarkToggleButton", () => {
  let wrapper: VueWrapper | undefined;

  beforeEach(async () => {
    await resetBookmarksForTests();
    await closeBookmarkDatabaseForTests();
    resetIndexedDb();
    route.path = "/pastebin.com/HdpnureE";
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
  });

  it("is hidden before bookmarks are ready", () => {
    wrapper = mount(BookmarkToggleButton, {
      props: {
        session: createSession(),
      },
    });

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("adds a bookmark for the clean route path", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.ensureLoaded();
    wrapper = mount(BookmarkToggleButton, {
      props: {
        session: createSession("Release tasks"),
      },
    });

    await wrapper.get("button").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.get("button").text()).toBe("Bookmarked");
      expect(bookmarks.bookmarks.value).toEqual([
        { routePath: "/pastebin.com/HdpnureE", title: "Release tasks", position: 0 },
      ]);
    });
  });

  it("removes an existing bookmark by route path", async () => {
    const bookmarks = useBookmarks();
    await bookmarks.addBookmark({ routePath: "/pastebin.com/HdpnureE", title: "Custom title" });
    wrapper = mount(BookmarkToggleButton, {
      props: {
        session: createSession(),
      },
    });

    await wrapper.get("button").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.get("button").text()).toBe("Bookmark");
      expect(bookmarks.bookmarks.value).toEqual([]);
    });
  });
});
