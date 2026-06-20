<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";

import { useBookmarks } from "@/bookmarks";

const bookmarks = useBookmarks();

onMounted(() => {
  void bookmarks.ensureLoaded();
});
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
