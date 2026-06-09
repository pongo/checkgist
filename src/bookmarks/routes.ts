import type { RouteLocationNormalizedLoaded } from "vue-router";

import { routeForReference } from "@/source-services/registry";
import type { SourceReference } from "@/source-services/types";

export function bookmarkRoutePathFromRoute(route: RouteLocationNormalizedLoaded): string {
  return route.path;
}

export function bookmarkRoutePathFromReference(reference: SourceReference): string {
  return routeForReference(reference);
}
