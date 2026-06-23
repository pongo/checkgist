import { shallowRef, type ShallowRef } from "vue";

import type { SourceReference } from "@/source-services";

import { loadChecklist, type LoadChecklistOptions, type LoadChecklistResult } from "./load";
import { listenToChecklistStateHash } from "../state/state-operations";
import type { Checklist } from "../types";

type ChecklistSourceLifecycleState =
  | { status: "idle"; session: null; message: "" }
  | { status: "loading"; session: null; message: "" }
  | { status: "ready"; session: Checklist; message: "" }
  | { status: "unsupported"; session: null; message: string }
  | { status: "error"; session: null; message: string };

export type ChecklistSourceBrowser = {
  getStateHash: () => string;
  listenToHash: (getSession: () => Checklist | null) => () => void;
  resetTitle: () => void;
  setTitle: (title: string) => void;
};

export type LoadChecklistSource = (
  reference: SourceReference | null,
  options: Pick<LoadChecklistOptions, "signal" | "stateHash">,
) => Promise<LoadChecklistResult>;

export type ChecklistSourceLifecycle = {
  state: Readonly<ShallowRef<ChecklistSourceLifecycleState>>;
  dispose: () => void;
  open: (reference: SourceReference | null) => Promise<void>;
};

export type ChecklistSourceLifecycleOptions = {
  browser?: ChecklistSourceBrowser;
  load?: LoadChecklistSource;
};

const idleState: ChecklistSourceLifecycleState = {
  status: "idle",
  session: null,
  message: "",
};

const loadingState: ChecklistSourceLifecycleState = {
  status: "loading",
  session: null,
  message: "",
};

export function useChecklistSourceLifecycle(
  options: ChecklistSourceLifecycleOptions = {},
): ChecklistSourceLifecycle {
  const browser = options.browser ?? createChecklistSourceBrowser();
  const load = options.load ?? loadChecklist;
  const state = shallowRef<ChecklistSourceLifecycleState>(idleState);

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

function createChecklistSourceBrowser(): ChecklistSourceBrowser {
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
