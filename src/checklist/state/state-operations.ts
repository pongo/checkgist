import {
  applyBitsToSession,
  bitsFromHash,
  bitsFromSession,
  bitsToHash,
  type ChecklistStateHash,
} from "./state-codec";
import { syncTaskItemState } from "../task-items/task-item-tree";
import type { ChecklistReadyFile, Checklist } from "../types";

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

function setTaskChecked(
  session: Checklist,
  fileId: string,
  localTaskIndex: number,
  checked: boolean,
): boolean {
  const file = session.files.find(
    (candidate) => candidate.status === "ready" && candidate.id === fileId,
  );

  if (file?.status !== "ready" || !Number.isInteger(localTaskIndex)) {
    return false;
  }

  if (localTaskIndex < 0 || localTaskIndex >= file.checked.length) {
    return false;
  }

  file.checked[localTaskIndex] = checked;
  syncReadyFileTaskItemState(file);
  return true;
}

function resetFile(session: Checklist, fileId: string): boolean {
  const file = session.files.find(
    (candidate) => candidate.status === "ready" && candidate.id === fileId,
  );

  if (file?.status !== "ready") {
    return false;
  }

  file.checked = file.checked.map(() => false);
  syncReadyFileTaskItemState(file);
  return true;
}

function resetAll(session: Checklist): void {
  for (const file of session.files) {
    if (file.status === "ready") {
      file.checked = file.checked.map(() => false);
      syncReadyFileTaskItemState(file);
    }
  }
}

function syncReadyFileTaskItemState(file: ChecklistReadyFile): void {
  syncTaskItemState(file.tree, file.checked);
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
