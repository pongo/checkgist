<script setup lang="ts">
import { ComarkRenderer } from "@comark/vue";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  resetChecklist,
  resetChecklistFile,
  setChecklistTaskChecked,
  type ChecklistStateOperationResult,
} from "./state/state-operations";
import {
  findTaskItemLabelElement,
  taskItemIndexFromCheckboxElement,
} from "./task-items/task-item-tree";
import type { ChecklistReadyFile, Checklist } from "./types";
import { copyToClipboard } from "@/shared/clipboard.ts";
import { createVariants } from "@/shared/useVariants";

const props = defineProps<{
  session: Checklist;
}>();

const route = useRoute();
const router = useRouter();
const markdownRenderVersion = ref(0);

const { provideAppVariants } = createVariants({
  TaskHover: {
    key: "1",
    /* "neutral", "accent", "outline", "stripe", "circle", "checkbox", "text" */
    variants: ["none", "circle", "checkbox"] as const,
  },
});
const { variants } = provideAppVariants();

function applyChecklistStateOperationResult(result: ChecklistStateOperationResult) {
  if (!result.changed) {
    return;
  }

  if (result.invalidateRender) {
    // The render key only needs a new value to remount the Markdown renderer.
    // Stryker disable next-line AssignmentOperator: incrementing or decrementing this private version changes only the fresh key value, not observable behavior
    markdownRenderVersion.value += 1;
  }

  void router.replace({
    path: route.path,
    query: route.query,
    hash: result.hash,
  });
}

function onTaskChange(file: ChecklistReadyFile, event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const taskIndex = taskItemIndexFromCheckboxElement(target);
  if (taskIndex === null) {
    return;
  }

  applyChecklistStateOperationResult(
    setChecklistTaskChecked(props.session, file.id, taskIndex, target.checked),
  );
}

function onTaskLabelClick(file: ChecklistReadyFile, event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target instanceof HTMLInputElement) {
    return;
  }

  if (target.closest("a") !== null) {
    return;
  }

  const code = target.closest("code");
  if (code !== null) {
    event.preventDefault();
    void copyToClipboard(code.textContent);
    return;
  }

  const label = findTaskItemLabelElement(target);
  if (label === null) {
    return;
  }

  const checkbox = label.querySelector<HTMLInputElement>("input[type='checkbox']");
  if (checkbox === null) {
    return;
  }

  const taskIndex = taskItemIndexFromCheckboxElement(checkbox);
  if (taskIndex === null) {
    return;
  }

  const nextChecked = !checkbox.checked;
  event.preventDefault();
  checkbox.checked = nextChecked;

  applyChecklistStateOperationResult(
    setChecklistTaskChecked(props.session, file.id, taskIndex, nextChecked),
  );
}

function onResetFile(fileId: string) {
  applyChecklistStateOperationResult(resetChecklistFile(props.session, fileId));
}

function resetAllTasks() {
  applyChecklistStateOperationResult(resetChecklist(props.session));
}

defineExpose({
  resetAllTasks,
});
</script>

<template>
  <div class="space-y-6">
    <p
      v-if="!session.hasTaskItems"
      class="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
    >
      No task items found in this source.
    </p>

    <section
      v-for="file in session.files"
      :key="file.id"
      :class="
        file.status === 'ready'
          ? 'overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
          : ''
      "
    >
      <template v-if="file.status === 'ready'">
        <div
          class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <h2 class="text-sm font-semibold break-all text-zinc-800 dark:text-zinc-200">
            {{ file.sourceFile.name }}
          </h2>
          <button
            class="min-h-7 rounded-md border border-zinc-300 bg-white px-2 text-xs font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            type="button"
            @click="onResetFile(file.id)"
          >
            Reset
          </button>
        </div>

        <article
          class="markdown-body checkgist-markdown px-4 py-5"
          :data-task-hover="variants.TaskHover"
          @click="onTaskLabelClick(file, $event)"
          @change="onTaskChange(file, $event)"
        >
          <Suspense :key="`${file.id}:${markdownRenderVersion}`">
            <ComarkRenderer :tree="file.tree" />
            <template #fallback>
              <span class="sr-only">Loading Markdown...</span>
            </template>
          </Suspense>
        </article>
      </template>

      <div
        v-else
        class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
      >
        <p class="font-medium break-all">{{ file.sourceFile.name }}</p>
        <p>{{ file.error.message }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
@media (hover: hover) {
  .checkgist-markdown :deep(.checkgist-task-label) {
    position: relative;
    isolation: isolate;
  }

  /* Cover the checkbox's negative margin without changing Markdown list spacing.
     The isolated layer stays behind inline content and cannot intercept clicks. */
  .checkgist-markdown :deep(.checkgist-task-label)::before {
    content: "";
    position: absolute;
    inset: -1px -4px -1px -1.4em;
    z-index: -1;
    border-radius: 4px;
    pointer-events: none;
  }

  .checkgist-markdown[data-task-hover="neutral"] :deep(.checkgist-task-label:hover)::before {
    background: light-dark(rgb(0 0 0 / 5%), rgb(255 255 255 / 8%));
  }

  .checkgist-markdown[data-task-hover="accent"] :deep(.checkgist-task-label:hover)::before {
    background: light-dark(rgb(59 130 246 / 10%), rgb(96 165 250 / 15%));
  }

  .checkgist-markdown[data-task-hover="outline"] :deep(.checkgist-task-label:hover)::before {
    box-shadow: inset 0 0 0 1px light-dark(rgb(113 113 122 / 45%), rgb(161 161 170 / 55%));
  }

  .checkgist-markdown[data-task-hover="stripe"] :deep(.checkgist-task-label:hover)::before {
    right: auto;
    left: -1.6em;
    width: 2px;
    background: light-dark(#2563eb, #60a5fa);
  }

  .checkgist-markdown[data-task-hover="circle"] :deep(.checkgist-task-label) {
    /* Keep repeated anchor names local to each task. */
    anchor-scope: --task-checkbox;
  }

  .checkgist-markdown[data-task-hover="circle"] :deep(.task-list-item-checkbox) {
    anchor-name: --task-checkbox;
  }

  .checkgist-markdown[data-task-hover="circle"] :deep(.checkgist-task-label:hover)::after {
    /* Use an after-pseudo so the checkbox is laid out before its anchored marker. */
    content: "";
    position: absolute;
    position-anchor: --task-checkbox;
    inset: 0.5lh auto auto -2em;
    width: 0.5em;
    height: 0.5em;
    transform: translateY(-50%);
    border-radius: 50%;
    background: #ccc;
    pointer-events: none;
  }

  @supports (anchor-scope: --task-checkbox) and (top: anchor(center)) {
    .checkgist-markdown[data-task-hover="circle"] :deep(.checkgist-task-label:hover)::after {
      top: anchor(center, 0.5lh);
    }
  }

  .checkgist-markdown[data-task-hover="checkbox"]
    :deep(.checkgist-task-label:hover .task-list-item-checkbox) {
    box-shadow: 0 0 0 3px light-dark(rgb(59 130 246 / 20%), rgb(96 165 250 / 30%));
  }

  .checkgist-markdown[data-task-hover="text"] :deep(.checkgist-task-label:hover) {
    color: light-dark(#1d4ed8, #93c5fd);
  }
}
</style>
