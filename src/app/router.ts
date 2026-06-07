import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/gist.github.com/:gistId",
      name: "github-gist-source",
      component: () => import("@/views/SourceReferenceView.vue"),
    },
    {
      path: "/pastebin.com/:pasteId",
      name: "pastebin-source",
      component: () => import("@/views/SourceReferenceView.vue"),
    },
  ],
});

export default router;
