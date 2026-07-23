import { createRouter, createWebHistory } from "vue-router";

import { createSourceRouteRecords } from "@/source-services";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/home/HomePage.vue"),
    },
    {
      path: "/local/:documentId/edit",
      name: "local-document-editor",
      component: () => import("@/pages/local-document/LocalDocumentEditorPage.vue"),
    },
    ...createSourceRouteRecords(() => import("@/pages/checklist/ChecklistPage.vue")),
  ],
});

export default router;
