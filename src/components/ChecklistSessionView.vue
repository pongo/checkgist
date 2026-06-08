<script setup lang="ts">
import { ComarkRenderer } from "@comark/vue";
import { ref } from "vue";

import { replaceBrowserHashState } from "@/checklist-session/browser-state";
import { resetAll, resetFile, setTaskChecked } from "@/checklist-session/state";
import type { ChecklistReadyFile, ChecklistSession } from "@/checklist-session/types";

const props = defineProps<{
  session: ChecklistSession;
}>();

const markdownRenderVersion = ref(0);

function onTaskChange(file: ChecklistReadyFile, event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const taskIndex = Number(target.dataset.checkgistTaskIndex);
  if (setTaskChecked(props.session, file.id, taskIndex, target.checked)) {
    replaceBrowserHashState(props.session);
  }
}

function onTaskLabelClick(file: ChecklistReadyFile, event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target instanceof HTMLInputElement) {
    return;
  }

  if (target.closest("a") !== null) {
    return;
  }

  const label = target.closest(".checkgist-task-label");
  if (!(label instanceof HTMLLabelElement)) {
    return;
  }

  const checkbox = label.querySelector<HTMLInputElement>("input[type='checkbox']");
  if (checkbox === null) {
    return;
  }

  const taskIndex = Number(checkbox.dataset.checkgistTaskIndex);
  const nextChecked = !checkbox.checked;
  event.preventDefault();
  checkbox.checked = nextChecked;

  if (setTaskChecked(props.session, file.id, taskIndex, nextChecked)) {
    replaceBrowserHashState(props.session);
  }
}

function onResetFile(fileId: string) {
  if (resetFile(props.session, fileId)) {
    markdownRenderVersion.value += 1;
    replaceBrowserHashState(props.session);
  }
}

function resetAllTasks() {
  resetAll(props.session);
  markdownRenderVersion.value += 1;
  replaceBrowserHashState(props.session);
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
          class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <h2 class="break-all text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {{ file.sourceFile.name }}
          </h2>
          <button
            class="min-h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            type="button"
            @click="onResetFile(file.id)"
          >
            Reset
          </button>
        </div>

        <article
          class="markdown-body checkgist-markdown px-4 py-5"
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
        <p class="break-all font-medium">{{ file.sourceFile.name }}</p>
        <p>{{ file.error.message }}</p>
      </div>
    </section>
  </div>
</template>
