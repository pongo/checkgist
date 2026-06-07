<script setup lang="ts">
import { ComarkRenderer } from "@comark/vue";

import { replaceBrowserHashState } from "@/checklist-session/browser-state";
import { resetAll, resetFile, setTaskChecked } from "@/checklist-session/state";
import type { ChecklistReadyFile, ChecklistSession } from "@/checklist-session/types";

const props = defineProps<{
  session: ChecklistSession;
}>();

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

function onResetFile(fileId: string) {
  if (resetFile(props.session, fileId)) {
    replaceBrowserHashState(props.session);
  }
}

function onResetAll() {
  resetAll(props.session);
  replaceBrowserHashState(props.session);
}
</script>

<template>
  <div class="space-y-6">
    <p
      v-if="!session.hasTaskItems"
      class="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
    >
      No task items found in this source.
    </p>

    <div class="flex justify-end">
      <button
        class="min-h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
        type="button"
        @click="onResetAll"
      >
        Reset all
      </button>
    </div>

    <section
      v-for="file in session.files"
      :key="file.id"
      class="space-y-3 border-t border-zinc-200 pt-5 first:border-t-0 first:pt-0 dark:border-zinc-800"
    >
      <template v-if="file.status === 'ready'">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="break-all text-base font-semibold">{{ file.sourceFile.name }}</h2>
          <button
            class="min-h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
            type="button"
            @click="onResetFile(file.id)"
          >
            Reset
          </button>
        </div>

        <article
          class="prose max-w-none text-zinc-950 dark:text-zinc-50"
          @change="onTaskChange(file, $event)"
        >
          <ComarkRenderer :tree="file.tree" />
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
