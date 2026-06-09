import {
  sourceRegistry,
  unsupportedSourceUrlMessage,
  type SourceRegistry,
} from "@/source-services/registry";
import type { SourceReference } from "@/source-services/types";

import { formatBrowserTitle } from "./browser-title";
import { buildChecklistSession } from "./build";
import type { ChecklistSession } from "./types";

export type LoadChecklistSessionOptions = {
  registry?: SourceRegistry;
  stateBits?: string | null;
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
  const session = await buildChecklistSession(source, {
    initialStateBits: options.stateBits,
  });

  return {
    status: "loaded",
    session,
    browserTitle: formatBrowserTitle(source.metadata.title),
  };
}
