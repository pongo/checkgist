import type { Checklist } from "../types";
import { syncSessionTaskCheckboxes } from "./state";

export type ChecklistStateBits = string;
export type ChecklistStateHash = string;

export function parseBits(bits?: string | null): ChecklistStateBits {
  if (bits == null) {
    return "";
  }

  return /^[01]*$/.test(bits) ? bits : "";
}

export function bitsFromHash(hash?: string | null): ChecklistStateBits {
  if (hash == null || hash === "") {
    return "";
  }

  return hash.startsWith("#") ? parseBits(hash.slice(1)) : "";
}

export function bitsToHash(bits: ChecklistStateBits): ChecklistStateHash {
  const parsedBits = parseBits(bits);

  return parsedBits.length > 0 ? `#${parsedBits}` : "";
}

export function applyBitsToSession(session: Checklist, bits: ChecklistStateBits): Checklist {
  const parsedBits = parseBits(bits);
  let bitIndex = 0;

  for (const file of session.files) {
    if (file.status !== "ready") {
      continue;
    }

    file.checked = file.checked.map(() => {
      const bit = parsedBits[bitIndex];
      bitIndex += 1;
      return bit === "1";
    });
  }

  syncSessionTaskCheckboxes(session);
  return session;
}

export function bitsFromSession(session: Checklist): ChecklistStateBits {
  const encoded = session.files
    .flatMap((file) =>
      file.status === "ready" ? file.checked.map((checked) => (checked ? "1" : "0")) : [],
    )
    .join("");

  return encoded.replace(/0+$/, "");
}
