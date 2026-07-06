import { githubGistAddressRule, githubGistService } from "./github-gist.ts";
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
];

/**
 * Addressing rules for every supported Source Service.
 */
export const sourceAddressRules = sourceServiceDefinitions.map(({ addressRule }) => addressRule);

/**
 * Loading adapters for every supported Source Service.
 */
export const sourceServices = sourceServiceDefinitions.map(({ service }) => service);
