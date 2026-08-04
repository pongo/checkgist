import { mount } from "@vue/test-utils";
import { computed, readonly, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { Bookmark } from "./db";

const bookmarkSnapshot = vi.hoisted(() => ({
  bookmarks: [] as Bookmark[],
  isReady: false,
}));

vi.mock("./useBookmarks", () => {
  const bookmarks = ref<Bookmark[]>([]);
  const isReady = ref(false);

  return {
    useBookmarks: () => {
      bookmarks.value = bookmarkSnapshot.bookmarks;
      isReady.value = bookmarkSnapshot.isReady;

      return {
        bookmarks: readonly(bookmarks),
        isReady: computed(() => isReady.value),
        removeBookmark: vi.fn<(routePath: string) => Promise<Bookmark | null>>(),
        renameBookmark: vi.fn<(routePath: string, title: string) => Promise<Bookmark | null>>(),
        reorderBookmark: vi.fn<(routePath: string, toIndex: number) => Promise<void>>(),
        restoreBookmark: vi.fn<(bookmark: Bookmark, toIndex: number) => Promise<void>>(),
      };
    },
  };
});

import BookmarkList from "./BookmarkList.vue";

const bookmarkedSource: Bookmark = {
  routePath: "/pastebin.com/one",
  title: "One",
  position: 0,
};

describe("BookmarkList visibility", () => {
  it.each([
    {
      bookmarks: [],
      isReady: true,
      scenario: "the loaded Bookmark snapshot is empty",
    },
    {
      bookmarks: [bookmarkedSource],
      isReady: false,
      scenario: "a previously loaded Bookmark snapshot is no longer ready",
    },
  ])("stays hidden when $scenario", ({ bookmarks, isReady }) => {
    bookmarkSnapshot.bookmarks = bookmarks;
    bookmarkSnapshot.isReady = isReady;
    const wrapper = mount(BookmarkList, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    });

    expect(wrapper.find("section").exists()).toBe(false);

    wrapper.unmount();
  });
});
