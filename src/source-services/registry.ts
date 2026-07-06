import { sourceServices } from "./services/index.ts";
import type { SourceReference, SourceService } from "./types";

/**
 * Lookup table for Source Service loading adapters by Source Reference type.
 */
export type SourceRegistry = {
  services: ReadonlyArray<SourceService<SourceReference>>;
  byType: ReadonlyMap<SourceReference["type"], SourceService<SourceReference>>;
};

/**
 * Builds a Source Service loading registry from concrete loading adapters.
 */
export function createSourceRegistry(
  services: ReadonlyArray<SourceService<SourceReference>>,
): SourceRegistry {
  return {
    services,
    byType: new Map(services.map((service) => [service.type, service])),
  };
}

/**
 * Application Source Service loading registry for all supported Source Services.
 */
export const sourceRegistry = createSourceRegistry(sourceServices);
