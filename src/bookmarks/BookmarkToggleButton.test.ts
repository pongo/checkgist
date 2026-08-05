import "fake-indexeddb/auto";

import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { IDBFactory } from "fake-indexeddb";
import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Checklist } from "@/checklist";

import {
  addBookmark as addBookmarkToDatabase,
  closeBookmarkDatabaseForTests,
  listBookmarks,
} from "./db";
import BookmarkToggleButton from "./BookmarkToggleButton.vue";
import { resetBookmarksForTests } from "./useBookmarks";

const route = reactive({
  path: "/pastebin.com/HdpnureE",
});

vi.mock("vue-router", () => ({
  useRoute: () => route,
}));

function resetIndexedDb() {
  vi.stubGlobal("indexedDB", new IDBFactory());
}

function createSession(title = "HdpnureE"): Checklist {
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

async function mountLoadedBookmarkToggle(title = "HdpnureE") {
  const wrapper = mount(BookmarkToggleButton, {
    props: {
      session: createSession(title),
    },
  });
  await vi.waitFor(() => expect(wrapper.find("button").exists()).toBe(true));
  return wrapper;
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
    wrapper = await mountLoadedBookmarkToggle("Release tasks");

    await wrapper.get("button").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.get("button").text()).toBe("Bookmarked");
    });
    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/HdpnureE", title: "Release tasks", position: 0 },
    ]);
  });

  it("treats a bookmark for another route as unrelated", async () => {
    await addBookmarkToDatabase({
      routePath: "/pastebin.com/another-checklist",
      title: "Another checklist",
    });
    wrapper = await mountLoadedBookmarkToggle();

    expect(wrapper.get("button").text()).toBe("Bookmark");

    await wrapper.get("button").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.get("button").text()).toBe("Bookmarked");
    });
    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/another-checklist", title: "Another checklist", position: 0 },
      { routePath: "/pastebin.com/HdpnureE", title: "HdpnureE", position: 1 },
    ]);
  });

  it("uses the route path when the source title is whitespace", async () => {
    wrapper = await mountLoadedBookmarkToggle(" \t ");

    await wrapper.get("button").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.get("button").text()).toBe("Bookmarked");
    });
    expect(await listBookmarks()).toEqual([
      { routePath: "/pastebin.com/HdpnureE", title: "/pastebin.com/HdpnureE", position: 0 },
    ]);
  });

  it("is disabled while toggling and becomes available after the update", async () => {
    wrapper = await mountLoadedBookmarkToggle();
    const button = wrapper.get("button");

    await button.trigger("click");

    expect(button.attributes("disabled")).toBeDefined();
    await vi.waitFor(() => {
      expect(button.text()).toBe("Bookmarked");
    });
    expect(button.attributes("disabled")).toBeUndefined();
  });

  it("removes an existing bookmark by route path", async () => {
    await addBookmarkToDatabase({
      routePath: "/pastebin.com/HdpnureE",
      title: "Custom title",
    });
    wrapper = await mountLoadedBookmarkToggle();

    await wrapper.get("button").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper?.get("button").text()).toBe("Bookmark");
    });
    expect(await listBookmarks()).toEqual([]);
  });
});
