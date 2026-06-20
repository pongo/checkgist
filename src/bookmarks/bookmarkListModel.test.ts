import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import {
  createBookmarkListModel,
  getBookmarkDropIndex,
  getCanonicalBookmarkDropIndicator,
} from "./bookmarkListModel";
import type { Bookmark } from "./db";

const one: Bookmark = { routePath: "/pastebin.com/one", title: "One", position: 0 };
const two: Bookmark = { routePath: "/pastebin.com/two", title: "Two", position: 1 };
const three: Bookmark = { routePath: "/pastebin.com/three", title: "Three", position: 2 };

function createModel(bookmarks = ref<Bookmark[]>([one, two, three])) {
  const removeBookmark = vi.fn<(routePath: string) => Promise<Bookmark | null>>(
    async (routePath) => {
      const removed = bookmarks.value.find((bookmark) => bookmark.routePath === routePath) ?? null;
      bookmarks.value = bookmarks.value.filter((bookmark) => bookmark.routePath !== routePath);
      return removed;
    },
  );
  const renameBookmark = vi.fn<(routePath: string, title: string) => Promise<Bookmark | null>>(
    async (routePath, title) => {
      const bookmark = bookmarks.value.find((current) => current.routePath === routePath) ?? null;
      bookmarks.value = bookmarks.value.map((current) =>
        current.routePath === routePath ? { ...current, title } : current,
      );
      return bookmark === null ? null : { ...bookmark, title };
    },
  );
  const reorderBookmark = vi.fn<(routePath: string, toIndex: number) => Promise<void>>(
    async (routePath, toIndex) => {
      const nextBookmarks = [...bookmarks.value];
      const fromIndex = nextBookmarks.findIndex((bookmark) => bookmark.routePath === routePath);

      if (fromIndex === -1) {
        return;
      }

      const [bookmark] = nextBookmarks.splice(fromIndex, 1);

      if (bookmark === undefined) {
        return;
      }

      nextBookmarks.splice(toIndex, 0, bookmark);
      bookmarks.value = nextBookmarks.map((current, position) => ({ ...current, position }));
    },
  );
  const restoreBookmark = vi.fn<(bookmark: Bookmark, toIndex: number) => Promise<void>>(
    async (bookmark, toIndex) => {
      const nextBookmarks = bookmarks.value.filter(
        (current) => current.routePath !== bookmark.routePath,
      );
      nextBookmarks.splice(toIndex, 0, bookmark);
      bookmarks.value = nextBookmarks.map((current, position) => ({ ...current, position }));
    },
  );

  return {
    bookmarks,
    model: createBookmarkListModel({
      bookmarks,
      removeBookmark,
      renameBookmark,
      reorderBookmark,
      restoreBookmark,
    }),
    removeBookmark,
    renameBookmark,
    reorderBookmark,
    restoreBookmark,
  };
}

describe("bookmark list model", () => {
  it("renders removed placeholders at their previous row position", async () => {
    const { model } = createModel();

    await model.deleteBookmark(two, 1);

    expect(model.rows.value).toEqual([
      { type: "bookmark", bookmark: one },
      { type: "removed", bookmark: two, position: 1 },
      { type: "bookmark", bookmark: three },
    ]);
  });

  it("restores a removed bookmark and clears its placeholder", async () => {
    const { bookmarks, model, restoreBookmark } = createModel();

    await model.deleteBookmark(two, 1);
    await model.restoreRemovedBookmark(two, 1);

    expect(restoreBookmark).toHaveBeenCalledWith(two, 1);
    expect(bookmarks.value).toEqual([one, two, three]);
    expect(model.rows.value).toEqual([
      { type: "bookmark", bookmark: one },
      { type: "bookmark", bookmark: two },
      { type: "bookmark", bookmark: three },
    ]);
  });

  it("trims titles before saving rename and ignores blank titles", async () => {
    const { model, renameBookmark } = createModel();

    model.startRename(one);
    await model.saveRename(one, "  Release checklist  ");
    await model.saveRename(one, "  ");

    expect(renameBookmark).toHaveBeenCalledExactlyOnceWith(one.routePath, "Release checklist");
    expect(model.editingRoutePath.value).toBe(null);
  });

  it("calculates stable reorder target indexes", () => {
    expect(getBookmarkDropIndex([one, two, three], one.routePath, three, "before")).toBe(1);
    expect(getBookmarkDropIndex([one, two, three], three.routePath, one, "before")).toBe(0);
    expect(getBookmarkDropIndex([one, two, three], two.routePath, one, "after")).toBe(1);
  });

  it("canonicalizes equivalent visual drop indicators", () => {
    expect(
      getCanonicalBookmarkDropIndicator([one, two, three], one.routePath, two, "after"),
    ).toEqual({
      routePath: three.routePath,
      position: "before",
    });
    expect(
      getCanonicalBookmarkDropIndicator([one, two, three], one.routePath, three, "before"),
    ).toEqual({
      routePath: three.routePath,
      position: "before",
    });
  });

  it("reorders through the current drop indicator", async () => {
    const { bookmarks, model } = createModel();

    model.beginDrag(one);
    model.previewDrop(three, "before");
    await model.dropOnBookmark(three, "before");

    expect(bookmarks.value).toEqual([
      { ...two, position: 0 },
      { ...one, position: 1 },
      { ...three, position: 2 },
    ]);
    expect(model.dropIndicator.value).toBe(null);
  });
});
