<script setup lang="ts">
import { Pencil, RotateCcw, Trash2 } from "@lucide/vue";
import { nextTick, ref, useTemplateRef, watch } from "vue";
import { RouterLink } from "vue-router";

import type { BookmarkRow, DropIndicatorPosition } from "./bookmarkListModel";
import type { Bookmark } from "./db";

const props = defineProps<{
  row: BookmarkRow;
  rowIndex: number;
  isEditing: boolean;
  dropIndicatorPosition: DropIndicatorPosition | null;
}>();

const emit = defineEmits<{
  startRename: [bookmark: Bookmark];
  rename: [bookmark: Bookmark, title: string];
  cancelRename: [];
  delete: [bookmark: Bookmark, rowIndex: number];
  restore: [bookmark: Bookmark, position: number];
  dragStart: [bookmark: Bookmark, event: DragEvent];
  dragEnd: [];
  dragOver: [bookmark: Bookmark, event: DragEvent];
  drop: [bookmark: Bookmark, event: DragEvent];
}>();

const editingTitle = ref("");
const editInput = useTemplateRef("editInput");

watch(
  () => props.isEditing,
  async (isEditing) => {
    if (!isEditing || props.row.type !== "bookmark") {
      return;
    }

    editingTitle.value = props.row.bookmark.title;
    await nextTick();
    editInput.value?.focus();
    editInput.value?.select();
  },
);

function saveRename() {
  if (props.row.type !== "bookmark") {
    return;
  }

  emit("rename", props.row.bookmark, editingTitle.value);
}

function onRowDragOver(event: DragEvent) {
  if (props.row.type !== "bookmark" || props.isEditing) {
    return;
  }

  emit("dragOver", props.row.bookmark, event);
}

function onRowDrop(event: DragEvent) {
  if (props.row.type !== "bookmark" || props.isEditing) {
    return;
  }

  emit("drop", props.row.bookmark, event);
}
</script>

<template>
  <li
    class="group relative flex h-6 items-center gap-3"
    :class="[
      row.type === 'removed' ? 'opacity-60' : '',
      dropIndicatorPosition === 'before'
        ? 'before:absolute before:top-0 before:right-0 before:left-0 before:h-0.5 before:rounded-full before:bg-blue-600 dark:before:bg-blue-400'
        : '',
      dropIndicatorPosition === 'after'
        ? 'after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:bg-blue-600 dark:after:bg-blue-400'
        : '',
    ]"
    @dragover="onRowDragOver"
    @drop="onRowDrop"
  >
    <span class="size-1.5 shrink-0 rounded-full bg-zinc-950 dark:bg-zinc-50" aria-hidden="true" />
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <template v-if="row.type === 'bookmark'">
        <RouterLink
          v-if="!isEditing"
          class="min-w-0 flex-1 truncate rounded-sm text-base text-zinc-800 group-hover:text-[#0969da] focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-200 dark:group-hover:text-[#4493f8]"
          :to="row.bookmark.routePath"
          draggable="true"
          @dragstart="emit('dragStart', row.bookmark, $event)"
          @dragend="emit('dragEnd')"
        >
          {{ row.bookmark.title }}
        </RouterLink>

        <input
          v-else
          ref="editInput"
          v-model="editingTitle"
          class="h-6 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-base leading-6 outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:bg-zinc-950"
          type="text"
          @blur="saveRename"
          @keydown.enter.prevent="saveRename"
          @keydown.escape.prevent="emit('cancelRename')"
        />

        <div
          v-if="!isEditing"
          class="ml-auto flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        >
          <button
            class="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            type="button"
            aria-label="Rename bookmark"
            @click="emit('startRename', row.bookmark)"
          >
            <Pencil class="size-3.5" aria-hidden="true" />
          </button>
          <button
            class="inline-flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            type="button"
            aria-label="Delete bookmark"
            @click="emit('delete', row.bookmark, rowIndex)"
          >
            <Trash2 class="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </template>

      <template v-else>
        <span class="min-w-0 flex-1 truncate text-base text-zinc-700 dark:text-zinc-300">
          {{ row.bookmark.title }}
        </span>
        <button
          class="ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          type="button"
          @click="emit('restore', row.bookmark, row.position)"
        >
          <RotateCcw class="size-4" aria-hidden="true" />
          Restore
        </button>
      </template>
    </div>
  </li>
</template>
