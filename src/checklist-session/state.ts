import type { ChecklistSession } from "./types";

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
  return true;
}

export function resetAll(session: ChecklistSession): ChecklistSession {
  for (const file of session.files) {
    if (file.status === "ready") {
      file.checked = file.checked.map(() => false);
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
