import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/pages/home/HomePage.vue"),
    },
    {
      path: "/gist.github.com/:gistId",
      name: "github-gist-source",
      component: () => import("@/pages/checklist/ChecklistPage.vue"),
    },
    {
      path: "/pastebin.com/:pasteId",
      name: "pastebin-source",
      component: () => import("@/pages/checklist/ChecklistPage.vue"),
    },
  ],
});

export default router;
