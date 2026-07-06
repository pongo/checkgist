import type { RouteComponent, RouteRecordRaw } from "vue-router";

import type { GitHubGistReference, PastebinReference, SourceReference } from "./types";

const GIST_HOST = "gist.github.com";
const PASTEBIN_HOST = "pastebin.com";

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

export const unsupportedSourceUrlMessage = "Enter a supported URL";

function isNonEmptySegment(segment: string | undefined): segment is string {
  return segment !== undefined && segment.length > 0;
}

function getPasteId(segments: string[]) {
  if (segments.length === 1 && segments[0] !== "raw") return segments[0];
  if (segments.length === 2 && segments[0] === "raw") return segments[1];
  return undefined;
}

const githubGistAddressRule: SourceAddressRule = {
  type: "github-gist",
  name: "github-gist-source",
  path: `/${GIST_HOST}/:gistId`,

  fromUrl(url: URL): GitHubGistReference | null {
    if (url.hostname.toLowerCase() !== GIST_HOST) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1 && segments.length !== 2) {
      return null;
    }

    const gistId = segments[segments.length - 1];
    return isNonEmptySegment(gistId) ? { type: "github-gist", gistId } : null;
  },

  fromRoute(path: string[]): GitHubGistReference | null {
    const [host, gistId, extra] = path;
    if (host !== GIST_HOST || extra !== undefined || !isNonEmptySegment(gistId)) {
      return null;
    }

    return { type: "github-gist", gistId };
  },

  toRouteSegments(reference: SourceReference): string[] | null {
    return reference.type === "github-gist" ? [GIST_HOST, reference.gistId] : null;
  },
};

const pastebinAddressRule: SourceAddressRule = {
  type: "pastebin",
  name: "pastebin-source",
  path: `/${PASTEBIN_HOST}/:pasteId`,

  fromUrl(url: URL): PastebinReference | null {
    if (url.hostname.toLowerCase() !== PASTEBIN_HOST) {
      return null;
    }

    const pasteId = getPasteId(url.pathname.split("/").filter(Boolean));
    return isNonEmptySegment(pasteId) ? { type: "pastebin", pasteId } : null;
  },

  fromRoute(path: string[]): PastebinReference | null {
    const [host, pasteId, extra] = path;
    if (host !== PASTEBIN_HOST || extra !== undefined || !isNonEmptySegment(pasteId)) {
      return null;
    }

    return { type: "pastebin", pasteId };
  },

  toRouteSegments(reference: SourceReference): string[] | null {
    return reference.type === "pastebin" ? [PASTEBIN_HOST, reference.pasteId] : null;
  },
};

export function createSourceAddressCatalog(
  rules: ReadonlyArray<SourceAddressRule>,
): SourceAddressCatalog {
  return {
    rules,
    byType: new Map(rules.map((rule) => [rule.type, rule])),
    routeDefinitions: rules.map(({ type, name, path }) => ({ type, name, path })),
  };
}

export const sourceAddressCatalog = createSourceAddressCatalog([
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

export function referenceFromRoutePath(
  routePath: string,
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): SourceReference | null {
  return referenceFromRoute(routePath.split("/").filter(Boolean), catalog);
}

export function routeForReference(
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

export function routeForUrlInput(
  input: string,
  catalog: SourceAddressCatalog = sourceAddressCatalog,
): string | null {
  const reference = referenceFromUrlInput(input, catalog);
  return reference === null ? null : routeForReference(reference, catalog);
}

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
