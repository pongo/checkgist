import { syncTaskItemState } from "../task-items/task-item-tree";
import type { ChecklistReadyFile, Checklist } from "../types";

export function setTaskChecked(
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

export function resetFile(session: Checklist, fileId: string): boolean {
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

export function resetAll(session: Checklist): Checklist {
  for (const file of session.files) {
    if (file.status === "ready") {
      file.checked = file.checked.map(() => false);
      syncReadyFileTaskItemState(file);
    }
  }

  return session;
}
export function syncSessionTaskCheckboxes(session: Checklist): void {
  for (const file of session.files) {
    if (file.status === "ready") {
      syncReadyFileTaskItemState(file);
    }
  }
}

function syncReadyFileTaskItemState(file: ChecklistReadyFile): void {
  syncTaskItemState(file.tree, file.checked);
}
