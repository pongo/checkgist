import { githubGistAddressRule, githubGistService } from "./github-gist.ts";
import { localDocumentAddressRule, localDocumentService } from "./local-document.ts";
import { pastebinAddressRule, pastebinService } from "./pastebin.ts";
import type { SourceAddressRule } from "../addressing.ts";
import type { SourceReference, SourceService } from "../types.ts";

type SourceServiceDefinition = {
  addressRule: SourceAddressRule;
  service: SourceService<SourceReference>;
};

const sourceServiceDefinitions: ReadonlyArray<SourceServiceDefinition> = [
  {
    addressRule: githubGistAddressRule,
    service: githubGistService,
  },
  {
    addressRule: pastebinAddressRule,
    service: pastebinService,
  },
  {
    addressRule: localDocumentAddressRule,
    service: localDocumentService,
  },
];

/**
 * Addressing rules for every supported Source Service.
 */
export const sourceAddressRules = sourceServiceDefinitions.map(({ addressRule }) => addressRule);

/**
 * Lookup table for Source Service loading adapters by Source Reference type.
 */
export type SourceRegistry = ReadonlyMap<SourceReference["type"], SourceService<SourceReference>>;

/**
 * Application Source Service loading registry for all supported Source Services.
 */
export const sourceRegistry: SourceRegistry = new Map(
  sourceServiceDefinitions.map(({ service }) => [service.type, service]),
);
