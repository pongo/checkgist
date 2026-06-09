<script setup lang="ts">
import { Bookmark as BookmarkIcon } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import type { ChecklistSession } from "@/checklist-session/types";

import { bookmarkRoutePathFromRoute } from "./routes";
import { useBookmarks } from "./useBookmarks";

const props = defineProps<{
  session: ChecklistSession;
}>();

const route = useRoute();
const { addBookmark, bookmarks, isReady, removeBookmark } = useBookmarks();
const isBusy = ref(false);
const routePath = computed(() => bookmarkRoutePathFromRoute(route));
const currentBookmark = computed(() =>
  bookmarks.value.find((bookmark) => bookmark.routePath === routePath.value),
);
const isBookmarked = computed(() => currentBookmark.value !== undefined);
const buttonText = computed(() => (isBookmarked.value ? "Bookmarked" : "Bookmark"));
const defaultTitle = computed(() => {
  const title = props.session.source.metadata.title.trim();
  return title.length > 0 ? title : routePath.value;
});

async function toggleBookmark() {
  if (!isReady.value || isBusy.value) {
    return;
  }

  isBusy.value = true;

  try {
    if (isBookmarked.value) {
      await removeBookmark(routePath.value);
    } else {
      await addBookmark({
        routePath: routePath.value,
        title: defaultTitle.value,
      });
    }
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <button
    v-if="isReady"
    class="flex min-h-8 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none disabled:cursor-default disabled:opacity-70 dark:border-zinc-700 dark:hover:bg-zinc-900"
    type="button"
    :aria-pressed="isBookmarked"
    :disabled="isBusy"
    @click="toggleBookmark"
  >
    <BookmarkIcon v-if="isBookmarked" class="size-4" aria-hidden="true" fill="currentColor" />
    <BookmarkIcon v-else class="size-4" aria-hidden="true" />
    <span>{{ buttonText }}</span>
  </button>
</template>
