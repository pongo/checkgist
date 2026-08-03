import { syncTaskItemState } from "../task-items/task-item-tree";
import type { ChecklistReadyFile, Checklist } from "../types";

type HashChangeTarget = Pick<Window, "addEventListener" | "removeEventListener">;
type ChecklistStateBits = string;

export type ChecklistStateOperationResult = {
  changed: boolean;
  hash: string;
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

function applyBitsToSession(session: Checklist, bits: ChecklistStateBits): void {
  let bitIndex = 0;

  for (const file of session.files) {
    if (file.status !== "ready") {
      continue;
    }

    file.checked = file.checked.map(() => {
      const bit = bits[bitIndex];
      bitIndex += 1;
      return bit === "1";
    });
  }

  syncSessionTaskCheckboxes(session);
}

function syncSessionTaskCheckboxes(session: Checklist): void {
  for (const file of session.files) {
    if (file.status === "ready") {
      syncReadyFileTaskItemState(file);
    }
  }
}

function syncReadyFileTaskItemState(file: ChecklistReadyFile): void {
  syncTaskItemState(file.tree, file.checked);
}

function parseBits(bits: string): ChecklistStateBits {
  return /^[01]*$/.test(bits) ? bits : "";
}

function bitsFromHash(hash?: string | null): ChecklistStateBits {
  if (hash == null || hash === "") {
    return "";
  }

  return hash.startsWith("#") ? parseBits(hash.slice(1)) : "";
}

function bitsToHash(bits: ChecklistStateBits): string {
  const parsedBits = parseBits(bits);

  return parsedBits.length > 0 ? `#${parsedBits}` : "";
}

function bitsFromSession(session: Checklist): ChecklistStateBits {
  const encoded = session.files
    .flatMap((file) =>
      file.status === "ready" ? file.checked.map((checked) => (checked ? "1" : "0")) : [],
    )
    .join("");

  return encoded.replace(/0+$/, "");
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
