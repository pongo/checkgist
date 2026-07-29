import { sourceServices } from "./services/index.ts";
import type { SourceReference, SourceService } from "./types";

/**
 * Lookup table for Source Service loading adapters by Source Reference type.
 */
export type SourceRegistry = ReadonlyMap<SourceReference["type"], SourceService<SourceReference>>;

/**
 * Application Source Service loading registry for all supported Source Services.
 */
export const sourceRegistry: SourceRegistry = new Map(
  sourceServices.map((service) => [service.type, service]),
);
