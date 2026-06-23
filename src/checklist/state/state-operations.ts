import {
  applyBitsToSession,
  bitsFromHash,
  bitsFromSession,
  bitsToHash,
  type ChecklistStateHash,
} from "./state-codec";
import { resetAll, resetFile, setTaskChecked } from "./state";
import type { Checklist } from "../types";

type HashChangeTarget = Pick<Window, "addEventListener" | "removeEventListener">;

export type ChecklistStateOperationResult = {
  changed: boolean;
  hash: ChecklistStateHash;
  invalidateRender: boolean;
};

export function setChecklistTaskChecked(
  session: Checklist,
  fileId: string,
  localTaskIndex: number,
  checked: boolean,
): ChecklistStateOperationResult {
  return createOperationResult(session, setTaskChecked(session, fileId, localTaskIndex, checked), {
    invalidateRender: false,
  });
}

export function resetChecklistFile(
  session: Checklist,
  fileId: string,
): ChecklistStateOperationResult {
  return createOperationResult(session, resetFile(session, fileId), {
    invalidateRender: true,
  });
}

export function resetChecklist(session: Checklist): ChecklistStateOperationResult {
  resetAll(session);

  return createOperationResult(session, true, {
    invalidateRender: true,
  });
}

export function applyChecklistStateHash(
  session: Checklist,
  hash: string | null | undefined,
): ChecklistStateOperationResult {
  applyBitsToSession(session, bitsFromHash(hash));

  return createOperationResult(session, true, {
    invalidateRender: true,
  });
}

export function listenToChecklistStateHash(
  getSession: () => Checklist | null | undefined,
  target: HashChangeTarget = window,
  location: Pick<Location, "hash"> = window.location,
): () => void {
  const onHashChange = () => {
    const session = getSession();
    if (session !== null && session !== undefined) {
      applyChecklistStateHash(session, location.hash);
    }
  };

  target.addEventListener("hashchange", onHashChange);

  return () => {
    target.removeEventListener("hashchange", onHashChange);
  };
}

function createOperationResult(
  session: Checklist,
  changed: boolean,
  options: Pick<ChecklistStateOperationResult, "invalidateRender">,
): ChecklistStateOperationResult {
  return {
    changed,
    hash: bitsToHash(bitsFromSession(session)),
    invalidateRender: options.invalidateRender,
  };
}
