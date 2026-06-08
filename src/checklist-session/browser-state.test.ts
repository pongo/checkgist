import { describe, expect, it, vi } from "vitest";

import { applySessionState } from "./state";
import {
  applyBrowserHashState,
  encodeBrowserHashState,
  listenToBrowserHashState,
} from "./browser-state";
import type { ChecklistSession } from "./types";

function createSession(): ChecklistSession {
  return {
    source: {
      reference: { type: "pastebin", pasteId: "source-1" },
      metadata: {
        title: "source-1",
        url: "https://pastebin.com/source-1",
      },
      files: [],
    },
    hasTaskItems: true,
    files: [
      {
        status: "ready",
        id: "one.md",
        sourceFile: {
          status: "ready",
          id: "one.md",
          name: "one.md",
          content: "",
        },
        tree: { frontmatter: {}, meta: {}, nodes: [] },
        checked: [false, false, false],
      },
    ],
  };
}

describe("browser Task Item State sync", () => {
  it("applies the current browser hash to a Checklist Session", () => {
    const session = createSession();

    applyBrowserHashState(session, { hash: "#101" });

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [true, false, true],
    });
  });

  it("encodes the current browser hash state", () => {
    const session = createSession();
    applySessionState(session, "101");

    expect(encodeBrowserHashState(session)).toBe("#101");
  });

  it("returns an empty hash when encoded state is empty", () => {
    const session = createSession();

    expect(encodeBrowserHashState(session)).toBe("");
  });

  it("re-applies Task Item State on browser hash changes", () => {
    const session = createSession();
    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener: vi.fn<(eventName: string, listener: EventListener) => void>(
        (eventName, listener) => {
          listeners.set(eventName, listener);
        },
      ),
      removeEventListener: vi.fn<(eventName: string, listener: EventListener) => void>(
        (eventName, listener) => {
          if (listeners.get(eventName) === listener) {
            listeners.delete(eventName);
          }
        },
      ),
    };
    const location = { hash: "#010" };

    const stop = listenToBrowserHashState(() => session, target, location);
    listeners.get("hashchange")?.(new Event("hashchange"));

    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [false, true, false],
    });

    stop();

    expect(listeners.has("hashchange")).toBe(false);
  });
});
