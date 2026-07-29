import type { ComarkNode, ComarkTree } from "comark";
import { describe, expect, it, vi } from "vitest";

import type { Checklist } from "../types";
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

function createSession(): Checklist {
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

function readyChecked(session: Checklist): boolean[][] {
  return session.files.flatMap((file) => (file.status === "ready" ? [file.checked] : []));
}

function renderedChecked(session: Checklist): boolean[][] {
  return session.files.flatMap((file) =>
    file.status === "ready"
      ? [
          file.tree.nodes.map(
            (node) => Array.isArray(node) && node[0] === "input" && node[1].checked === true,
          ),
        ]
      : [],
  );
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

    const errorFileResult = setChecklistTaskChecked(session, "broken.md", 0, true);
    const outOfRangeResult = setChecklistTaskChecked(session, "two.md", 2, true);
    const nonIntegerResult = setChecklistTaskChecked(session, "two.md", 0.5, true);

    expect(errorFileResult).toEqual({
      changed: false,
      hash: "#1",
      invalidateRender: false,
    });
    expect(outOfRangeResult.changed).toBe(false);
    expect(nonIntegerResult.changed).toBe(false);
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

  it("ignores reset intents for files that are not ready", () => {
    const session = createSession();
    setChecklistTaskChecked(session, "one.md", 0, true);

    expect(resetChecklistFile(session, "broken.md")).toEqual({
      changed: false,
      hash: "#1",
      invalidateRender: true,
    });
    expect(readyChecked(session)).toEqual([
      [true, false, false],
      [false, false],
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

    const result = applyChecklistStateHash(session, "#10101");

    expect(result).toEqual({
      changed: true,
      hash: "#10101",
      invalidateRender: true,
    });
    expect(readyChecked(session)).toEqual([
      [true, false, true],
      [false, true],
    ]);
    expect(renderedChecked(session)).toEqual([
      [true, false, true],
      [false, true],
    ]);
  });

  it.each([
    [
      "#1",
      [
        [true, false, false],
        [false, false],
      ],
      "#1",
    ],
    [
      "#010111111",
      [
        [false, true, false],
        [true, true],
      ],
      "#01011",
    ],
    [
      "#10100",
      [
        [true, false, true],
        [false, false],
      ],
      "#101",
    ],
  ] as const)(
    "treats missing positions as unchecked and ignores extra positions: %s",
    (hash, expectedChecked, expectedHash) => {
      const session = createSession();

      const result = applyChecklistStateHash(session, hash);

      expect(result.hash).toBe(expectedHash);
      expect(readyChecked(session)).toEqual(expectedChecked);
    },
  );

  it.each([undefined, null, "", "101", "##101", "#10x"])(
    "treats missing, empty, or invalid hash state as all unchecked: %s",
    (hash) => {
      const session = createSession();
      setChecklistTaskChecked(session, "one.md", 0, true);
      setChecklistTaskChecked(session, "two.md", 1, true);

      const result = applyChecklistStateHash(session, hash);

      expect(result.hash).toBe("");
      expect(readyChecked(session)).toEqual([
        [false, false, false],
        [false, false],
      ]);
    },
  );

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
