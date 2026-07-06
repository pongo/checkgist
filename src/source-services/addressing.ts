import type { RouteComponent, RouteRecordRaw } from "vue-router";

import { githubGistAddressRule } from "./services/github-gist.ts";
import { pastebinAddressRule } from "./services/pastebin.ts";
import type { SourceReference } from "./types";

type SourceRouteDefinition = {
  type: SourceReference["type"];
  name: string;
  path: string;
};

export type SourceAddressRule = SourceRouteDefinition & {
  fromUrl: (url: URL) => SourceReference | null;
  fromRoute: (path: string[]) => SourceReference | null;
  toRouteSegments: (reference: SourceReference) => string[] | null;
};

export type SourceAddressCatalog = {
  rules: ReadonlyArray<SourceAddressRule>;
  byType: ReadonlyMap<SourceReference["type"], SourceAddressRule>;
  routeDefinitions: ReadonlyArray<SourceRouteDefinition>;
};

/**
 * User-facing validation message for text that cannot become a supported Source URL.
 */
export const unsupportedSourceUrlMessage = "Enter a supported URL";

export function createSourceAddressCatalog(
  rules: ReadonlyArray<SourceAddressRule>,
): SourceAddressCatalog {
  return {
    rules,
    byType: new Map(rules.map((rule) => [rule.type, rule])),
    routeDefinitions: rules.map(({ type, name, path }) => ({ type, name, path })),
  };
}

const sourceAddressCatalog = createSourceAddressCatalog([
  githubGistAddressRule,
  pastebinAddressRule,
]);

function normalizeSourceUrlInput(input: string): URL | null {
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    return null;
  }

  const inputWithProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmedInput)
    ? trimmedInput
    : `https://${trimmedInput}`;

  try {
    const url = new URL(inputWithProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

/**
 * Parses user-entered text into a Source Reference when the catalog recognizes
 * it. Inputs without a protocol are treated as HTTPS URLs.
 */
export function referenceFromUrlInput(
  input: string,
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): SourceReference | null {
  const url = normalizeSourceUrlInput(input);
  if (url === null) {
    return null;
  }

  for (const rule of catalog.rules) {
    const reference = rule.fromUrl(url);
    if (reference !== null) {
      return reference;
    }
  }

  return null;
}

export function referenceFromRoute(
  path: string[],
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): SourceReference | null {
  for (const rule of catalog.rules) {
    const reference = rule.fromRoute(path);
    if (reference !== null) {
      return reference;
    }
  }

  return null;
}

/**
 * Parses a browser route path into a Source Reference when it matches a supported app route.
 */
export function referenceFromRoutePath(
  routePath: string,
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): SourceReference | null {
  return referenceFromRoute(routePath.split("/").filter(Boolean), catalog);
}

/**
 * Converts user-entered Source URL text directly into the canonical app route.
 */
export function routeForUrlInput(
  input: string,
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): string | null {
  const reference = referenceFromUrlInput(input, catalog);
  return reference === null ? null : routeForReference(reference, catalog);
}

/**
 * Builds Vue route records for every supported Source Service route.
 */
export function createSourceRouteRecords(
  component: RouteComponent,
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): RouteRecordRaw[] {
  return catalog.routeDefinitions.map(({ name, path }) => ({
    path,
    name,
    component,
  }));
}

function routeForReference(
  reference: SourceReference,
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): string {
  const rule = catalog.byType.get(reference.type);
  const segments = rule?.toRouteSegments(reference);

  if (segments === undefined || segments === null) {
    throw new Error(`Unknown Source Service type: ${reference.type}`);
  }

  return `/${segments.map(encodeURIComponent).join("/")}`;
}
