import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/HomePage.vue"),
    },
    {
      path: "/gist.github.com/:gistId",
      name: "github-gist-source",
      component: () => import("@/pages/SourceReference/SourceReferencePage.vue"),
    },
    {
      path: "/pastebin.com/:pasteId",
      name: "pastebin-source",
      component: () => import("@/pages/SourceReference/SourceReferencePage.vue"),
    },
  ],
});

export default router;
