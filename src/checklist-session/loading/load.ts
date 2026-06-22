import {
  sourceRegistry,
  unsupportedSourceUrlMessage,
  type SourceReference,
  type SourceRegistry,
} from "@/source-services";

import { formatBrowserTitle } from "./browser-title";
import { buildChecklistSession } from "./build";
import { applyChecklistStateHash } from "../state/state-operations";
import type { ChecklistSession } from "../types";

export type LoadChecklistSessionOptions = {
  registry?: SourceRegistry;
  stateHash?: string | null;
  signal?: AbortSignal;
};

export type LoadedChecklistSession = {
  status: "loaded";
  session: ChecklistSession;
  browserTitle: string;
};

export type UnsupportedChecklistSessionSource = {
  status: "unsupported";
  message: string;
};

export type LoadChecklistSessionResult = LoadedChecklistSession | UnsupportedChecklistSessionSource;

export async function loadChecklistSession(
  reference: SourceReference | null,
  options: LoadChecklistSessionOptions = {},
): Promise<LoadChecklistSessionResult> {
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
  const session = await buildChecklistSession(source);

  if (options.stateHash !== undefined && options.stateHash !== null) {
    applyChecklistStateHash(session, options.stateHash);
  }

  return {
    status: "loaded",
    session,
    browserTitle: formatBrowserTitle(source.metadata.title),
  };
}
