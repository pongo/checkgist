import {
  sourceRegistry,
  unsupportedSourceUrlMessage,
  type SourceReference,
  type SourceRegistry,
} from "@/source-services";

import { formatBrowserTitle } from "./browser-title";
import { buildChecklist } from "./build";
import { applyChecklistStateHash } from "../state/state-operations";
import type { Checklist } from "../types";

export type LoadChecklistOptions = {
  registry?: SourceRegistry;
  stateHash?: string | null;
  signal?: AbortSignal;
};

type LoadedChecklist = {
  status: "loaded";
  session: Checklist;
  browserTitle: string;
};

type UnsupportedChecklistSource = {
  status: "unsupported";
  message: string;
};

export type LoadChecklistResult = LoadedChecklist | UnsupportedChecklistSource;

export async function loadChecklist(
  reference: SourceReference | null,
  options: LoadChecklistOptions = {},
): Promise<LoadChecklistResult> {
  if (reference === null) {
    return {
      status: "unsupported",
      message: unsupportedSourceUrlMessage,
    };
  }

  const registry = options.registry ?? sourceRegistry;
  const service = registry.byType.get(reference.type);

  if (service === undefined) {
    return {
      status: "unsupported",
      message: unsupportedSourceUrlMessage,
    };
  }

  const source = await service.load(reference, { signal: options.signal });
  const session = await buildChecklist(source);

  if (options.stateHash !== undefined && options.stateHash !== null) {
    applyChecklistStateHash(session, options.stateHash);
  }

  return {
    status: "loaded",
    session,
    browserTitle: formatBrowserTitle(source.metadata.title),
  };
}
