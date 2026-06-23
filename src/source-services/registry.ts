import { githubGistService } from "./services/github-gist.ts";
import { pastebinService } from "./services/pastebin.ts";
import type { SourceReference, SourceService } from "./types";

export type SourceRegistry = {
  services: ReadonlyArray<SourceService<SourceReference>>;
  byType: ReadonlyMap<SourceReference["type"], SourceService<SourceReference>>;
};

export const unsupportedSourceUrlMessage = "Enter a supported URL";

export function createSourceRegistry(
  services: ReadonlyArray<SourceService<SourceReference>>,
): SourceRegistry {
  return {
    services,
    byType: new Map(services.map((service) => [service.type, service])),
  };
}

export const sourceRegistry = createSourceRegistry([githubGistService, pastebinService]);

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
 * Parses user-entered text into a Source Reference when a registered Source
 * Service recognizes it.
 *
 * Inputs without a protocol are treated as HTTPS URLs. Unsupported protocols,
 * malformed URLs, and unknown services return null.
 */
export function referenceFromUrlInput(
  input: string,
  registry: SourceRegistry = sourceRegistry,
): SourceReference | null {
  const url = normalizeSourceUrlInput(input);
  if (url === null) {
    return null;
  }

  for (const service of registry.services) {
    const reference = service.fromUrl(url);
    if (reference !== null) {
      return reference;
    }
  }

  return null;
}

/**
 * Parses decoded app route segments into a Source Reference when a registered
 * Source Service recognizes them.
 */
export function referenceFromRoute(
  path: string[],
  registry: SourceRegistry = sourceRegistry,
): SourceReference | null {
  for (const service of registry.services) {
    const reference = service.fromRoute(path);
    if (reference !== null) {
      return reference;
    }
  }

  return null;
}

/**
 * Builds the canonical app route for a Source Reference.
 *
 * Throws when the registry has no Source Service for the reference type, because
 * that indicates an internal mismatch between references and registered services.
 */
export function routeForReference(
  reference: SourceReference,
  registry: SourceRegistry = sourceRegistry,
): string {
  const service = registry.byType.get(reference.type);
  if (service === undefined) {
    throw new Error(`Unknown Source Service type: ${reference.type}`);
  }

  return `/${service.toRoute(reference).map(encodeURIComponent).join("/")}`;
}
