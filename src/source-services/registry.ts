import { githubGistService } from "./github-gist";
import { pastebinService } from "./pastebin";
import type { SourceReference, SourceService } from "./types";

export type SourceRegistry = {
  services: ReadonlyArray<SourceService<SourceReference>>;
  byType: ReadonlyMap<SourceReference["type"], SourceService<SourceReference>>;
};

export const unsupportedSourceUrlMessage =
  "Enter a supported GitHub Gist or Pastebin URL.";

export function createSourceRegistry(
  services: ReadonlyArray<SourceService<SourceReference>>,
): SourceRegistry {
  return {
    services,
    byType: new Map(services.map((service) => [service.type, service])),
  };
}

export const sourceRegistry = createSourceRegistry([
  githubGistService,
  pastebinService,
]);

export function normalizeSourceUrlInput(input: string): URL | null {
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
