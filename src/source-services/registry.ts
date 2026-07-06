import { githubGistService } from "./services/github-gist.ts";
import { pastebinService } from "./services/pastebin.ts";
import type { SourceReference, SourceService } from "./types";

export type SourceRegistry = {
  services: ReadonlyArray<SourceService<SourceReference>>;
  byType: ReadonlyMap<SourceReference["type"], SourceService<SourceReference>>;
};

export function createSourceRegistry(
  services: ReadonlyArray<SourceService<SourceReference>>,
): SourceRegistry {
  return {
    services,
    byType: new Map(services.map((service) => [service.type, service])),
  };
}

export const sourceRegistry = createSourceRegistry([githubGistService, pastebinService]);
