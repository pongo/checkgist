import { shallowRef, type ShallowRef } from "vue";

import type { SourceReference } from "@/source-services";

import {
  loadChecklistSession,
  type LoadChecklistSessionOptions,
  type LoadChecklistSessionResult,
} from "./load";
import { listenToChecklistStateHash } from "./state-operations";
import type { ChecklistSession } from "./types";

export type ChecklistSourceReferenceLifecycleState =
  | { status: "idle"; session: null; message: "" }
  | { status: "loading"; session: null; message: "" }
  | { status: "ready"; session: ChecklistSession; message: "" }
  | { status: "unsupported"; session: null; message: string }
  | { status: "error"; session: null; message: string };

export type ChecklistSourceReferenceBrowser = {
  getStateHash: () => string;
  listenToHash: (getSession: () => ChecklistSession | null) => () => void;
  resetTitle: () => void;
  setTitle: (title: string) => void;
};

export type LoadChecklistSourceReference = (
  reference: SourceReference | null,
  options: Pick<LoadChecklistSessionOptions, "signal" | "stateHash">,
) => Promise<LoadChecklistSessionResult>;

export type ChecklistSourceReferenceLifecycle = {
  state: Readonly<ShallowRef<ChecklistSourceReferenceLifecycleState>>;
  dispose: () => void;
  open: (reference: SourceReference | null) => Promise<void>;
};

export type ChecklistSourceReferenceLifecycleOptions = {
  browser?: ChecklistSourceReferenceBrowser;
  load?: LoadChecklistSourceReference;
};

const idleState: ChecklistSourceReferenceLifecycleState = {
  status: "idle",
  session: null,
  message: "",
};

const loadingState: ChecklistSourceReferenceLifecycleState = {
  status: "loading",
  session: null,
  message: "",
};

export function useChecklistSourceReferenceLifecycle(
  options: ChecklistSourceReferenceLifecycleOptions = {},
): ChecklistSourceReferenceLifecycle {
  const browser = options.browser ?? createChecklistSourceReferenceBrowser();
  const load = options.load ?? loadChecklistSession;
  const state = shallowRef<ChecklistSourceReferenceLifecycleState>(idleState);

  let activeLoadToken = 0;
  let abortController: AbortController | null = null;
  let stopHashStateListener: (() => void) | null = null;

  async function open(reference: SourceReference | null) {
    activeLoadToken += 1;
    const loadToken = activeLoadToken;
    abortController?.abort();
    abortController = new AbortController();
    stopHashStateListener?.();
    stopHashStateListener = null;
    state.value = loadingState;

    try {
      const result = await load(reference, {
        stateHash: browser.getStateHash(),
        signal: abortController.signal,
      });

      if (loadToken !== activeLoadToken) {
        return;
      }

      if (result.status === "unsupported") {
        browser.resetTitle();
        state.value = {
          status: "unsupported",
          session: null,
          message: result.message,
        };
        return;
      }

      browser.setTitle(result.browserTitle);
      state.value = {
        status: "ready",
        session: result.session,
        message: "",
      };
      stopHashStateListener = browser.listenToHash(() =>
        state.value.status === "ready" ? state.value.session : null,
      );
    } catch (error) {
      if (loadToken !== activeLoadToken) {
        return;
      }

      browser.resetTitle();
      state.value = {
        status: "error",
        session: null,
        message: error instanceof Error ? error.message : "Failed to load source.",
      };
    }
  }

  function dispose() {
    activeLoadToken += 1;
    abortController?.abort();
    abortController = null;
    stopHashStateListener?.();
    stopHashStateListener = null;
  }

  return {
    state,
    open,
    dispose,
  };
}

function createChecklistSourceReferenceBrowser(): ChecklistSourceReferenceBrowser {
  return {
    getStateHash: () => window.location.hash,
    listenToHash: listenToChecklistStateHash,
    resetTitle: () => {
      document.title = "Checkgist";
    },
    setTitle: (title) => {
      document.title = title;
    },
  };
}
