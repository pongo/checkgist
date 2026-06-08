import type { ChecklistSession } from "./types";
import { applySessionState, encodeSessionState } from "./state";

type HashChangeTarget = Pick<Window, "addEventListener" | "removeEventListener">;

export function applyBrowserHashState(
  session: ChecklistSession,
  location: Pick<Location, "hash"> = window.location,
): ChecklistSession {
  return applySessionState(session, location.hash);
}

export function encodeBrowserHashState(session: ChecklistSession): string {
  const encodedState = encodeSessionState(session);

  return encodedState.length > 0 ? `#${encodedState}` : "";
}

export function listenToBrowserHashState(
  getSession: () => ChecklistSession | null | undefined,
  target: HashChangeTarget = window,
  location: Pick<Location, "hash"> = window.location,
): () => void {
  const onHashChange = () => {
    const session = getSession();
    if (session !== null && session !== undefined) {
      applyBrowserHashState(session, location);
    }
  };

  target.addEventListener("hashchange", onHashChange);

  return () => {
    target.removeEventListener("hashchange", onHashChange);
  };
}
