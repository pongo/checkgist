import type { ComarkNode, ComarkTree } from "comark";
import { describe, expect, it, vi } from "vitest";

import type { ChecklistSession } from "./types";
import {
  applyChecklistStateHash,
  listenToChecklistStateHash,
  resetChecklist,
  resetChecklistFile,
  setChecklistTaskChecked,
} from "./state-operations";

function createTree(taskCount: number): ComarkTree {
  return {
    frontmatter: {},
    meta: {},
    nodes: Array.from({ length: taskCount }, (_, taskIndex) => [
      "input",
      {
        class: "task-list-item-checkbox",
        type: "checkbox",
        "data-checkgist-task-index": String(taskIndex),
      },
    ]) as ComarkNode[],
  };
}

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
        tree: createTree(3),
        checked: [false, false, false],
      },
      {
        status: "error",
        id: "broken.md",
        sourceFile: {
          status: "error",
          id: "broken.md",
          name: "broken.md",
          error: { message: "Broken." },
        },
        error: { message: "Broken." },
      },
      {
        status: "ready",
        id: "two.md",
        sourceFile: {
          status: "ready",
          id: "two.md",
          name: "two.md",
          content: "",
        },
        tree: createTree(2),
        checked: [false, false],
      },
    ],
  };
}

function readyChecked(session: ChecklistSession): boolean[][] {
  return session.files.flatMap((file) => (file.status === "ready" ? [file.checked] : []));
}

describe("Checklist State operations", () => {
  it("sets a Task Item and returns the canonical hash without render invalidation", () => {
    const session = createSession();

    const result = setChecklistTaskChecked(session, "two.md", 1, true);

    expect(result).toEqual({
      changed: true,
      hash: "#00001",
      invalidateRender: false,
    });
    expect(readyChecked(session)).toEqual([
      [false, false, false],
      [false, true],
    ]);
  });

  it("ignores invalid Task Item intents and reports the current hash", () => {
    const session = createSession();
    setChecklistTaskChecked(session, "one.md", 0, true);

    const result = setChecklistTaskChecked(session, "broken.md", 0, true);

    expect(result).toEqual({
      changed: false,
      hash: "#1",
      invalidateRender: false,
    });
    expect(readyChecked(session)).toEqual([
      [true, false, false],
      [false, false],
    ]);
  });

  it("resets one Source File and requests render invalidation", () => {
    const session = createSession();
    setChecklistTaskChecked(session, "one.md", 0, true);
    setChecklistTaskChecked(session, "two.md", 1, true);

    const result = resetChecklistFile(session, "one.md");

    expect(result).toEqual({
      changed: true,
      hash: "#00001",
      invalidateRender: true,
    });
    expect(readyChecked(session)).toEqual([
      [false, false, false],
      [false, true],
    ]);
  });

  it("resets all ready Source Files and trims trailing unchecked state from the hash", () => {
    const session = createSession();
    setChecklistTaskChecked(session, "one.md", 2, true);
    setChecklistTaskChecked(session, "two.md", 1, true);

    const result = resetChecklist(session);

    expect(result).toEqual({
      changed: true,
      hash: "",
      invalidateRender: true,
    });
    expect(readyChecked(session)).toEqual([
      [false, false, false],
      [false, false],
    ]);
  });

  it("applies browser hash state and reports a normalized hash", () => {
    const session = createSession();

    const result = applyChecklistStateHash(session, "#10100");

    expect(result).toEqual({
      changed: true,
      hash: "#101",
      invalidateRender: true,
    });
    expect(readyChecked(session)).toEqual([
      [true, false, true],
      [false, false],
    ]);
  });

  it("re-applies Checklist State on browser hash changes", () => {
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

    const stop = listenToChecklistStateHash(() => session, target, location);
    listeners.get("hashchange")?.(new Event("hashchange"));

    expect(readyChecked(session)).toEqual([
      [false, true, false],
      [false, false],
    ]);

    stop();

    expect(listeners.has("hashchange")).toBe(false);
  });
});
