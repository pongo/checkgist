import type { ComarkElement, ComarkNode } from "comark";

import type { ChecklistReadyFile, ChecklistSession } from "./types";

export function applySessionState(
  session: ChecklistSession,
  stateBits?: string | null,
): ChecklistSession {
  const bits = parseStateBits(stateBits);
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
  return session;
}

export function encodeSessionState(session: ChecklistSession): string {
  const encoded = session.files
    .flatMap((file) =>
      file.status === "ready" ? file.checked.map((checked) => (checked ? "1" : "0")) : [],
    )
    .join("");

  return encoded.replace(/0+$/, "");
}

export function setTaskChecked(
  session: ChecklistSession,
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
  syncReadyFileTaskCheckboxes(file);
  return true;
}

export function resetFile(session: ChecklistSession, fileId: string): boolean {
  const file = session.files.find(
    (candidate) => candidate.status === "ready" && candidate.id === fileId,
  );

  if (file?.status !== "ready") {
    return false;
  }

  file.checked = file.checked.map(() => false);
  syncReadyFileTaskCheckboxes(file);
  return true;
}

export function resetAll(session: ChecklistSession): ChecklistSession {
  for (const file of session.files) {
    if (file.status === "ready") {
      file.checked = file.checked.map(() => false);
      syncReadyFileTaskCheckboxes(file);
    }
  }

  return session;
}

export function parseStateBits(stateBits?: string | null): string {
  if (stateBits === undefined || stateBits === null) {
    return "";
  }

  const normalized = stateBits.startsWith("#") ? stateBits.slice(1) : stateBits;
  return /^[01]*$/.test(normalized) ? normalized : "";
}

export function syncSessionTaskCheckboxes(session: ChecklistSession): void {
  for (const file of session.files) {
    if (file.status === "ready") {
      syncReadyFileTaskCheckboxes(file);
    }
  }
}

function syncReadyFileTaskCheckboxes(file: ChecklistReadyFile): void {
  visitNodes(file.tree.nodes, (node) => {
    if (!isTaskCheckbox(node)) {
      return;
    }

    const taskIndex = Number(node[1]["data-checkgist-task-index"]);
    if (!Number.isInteger(taskIndex)) {
      return;
    }

    if (file.checked[taskIndex] === true) {
      node[1].checked = true;
    } else {
      delete node[1].checked;
    }
  });
}

function isTaskCheckbox(node: ComarkNode): node is ComarkElement {
  if (!isElement(node)) {
    return false;
  }

  return node[0] === "input" && node[1]["data-checkgist-task-index"] !== undefined;
}

function visitNodes(nodes: ComarkNode[], visit: (node: ComarkNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (isElement(node)) {
      visitNodes(node.slice(2) as ComarkNode[], visit);
    }
  }
}

function isElement(node: ComarkNode): node is ComarkElement {
  return Array.isArray(node) && node[0] !== null;
}
