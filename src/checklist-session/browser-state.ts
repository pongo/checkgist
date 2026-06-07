import type { ChecklistSession } from "./types";
import { applySessionState, encodeSessionState } from "./state";

type BrowserHashEnvironment = {
  location: Pick<Location, "hash" | "pathname" | "search">;
  history: Pick<History, "replaceState" | "state">;
};

type HashChangeTarget = Pick<Window, "addEventListener" | "removeEventListener">;

export function applyBrowserHashState(
  session: ChecklistSession,
  location: Pick<Location, "hash"> = window.location,
): ChecklistSession {
  return applySessionState(session, location.hash);
}

export function replaceBrowserHashState(
  session: ChecklistSession,
  environment: BrowserHashEnvironment = {
    location: window.location,
    history: window.history,
  },
): void {
  const encodedState = encodeSessionState(session);
  const nextUrl = `${environment.location.pathname}${environment.location.search}${
    encodedState.length > 0 ? `#${encodedState}` : ""
  }`;

  environment.history.replaceState(environment.history.state, "", nextUrl);
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
