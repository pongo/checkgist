import { describe, expect, it } from "vitest";

import type { ChecklistSession } from "./types";
import { resetAll, resetFile, setTaskChecked } from "./state";

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
        tree: { frontmatter: {}, meta: {}, nodes: [] },
        checked: [false, false],
      },
    ],
  };
}

function readyChecked(session: ChecklistSession): boolean[][] {
  return session.files.flatMap((file) => (file.status === "ready" ? [file.checked] : []));
}

describe("Checklist Session state", () => {
  it("updates file-local Task Item State without global task ranges", () => {
    const session = createSession();

    expect(setTaskChecked(session, "two.md", 1, true)).toBe(true);
    expect(readyChecked(session)).toEqual([
      [false, false, false],
      [false, true],
    ]);
    expect(setTaskChecked(session, "two.md", 2, true)).toBe(false);
    expect(setTaskChecked(session, "broken.md", 0, true)).toBe(false);
  });

  it("resets one file or all ready files without consuming error files", () => {
    const session = createSession();
    setTaskChecked(session, "one.md", 0, true);
    setTaskChecked(session, "one.md", 1, true);
    setTaskChecked(session, "one.md", 2, true);
    setTaskChecked(session, "two.md", 0, true);
    setTaskChecked(session, "two.md", 1, true);

    expect(resetFile(session, "one.md")).toBe(true);
    expect(resetFile(session, "broken.md")).toBe(false);
    expect(readyChecked(session)).toEqual([
      [false, false, false],
      [true, true],
    ]);

    resetAll(session);

    expect(readyChecked(session)).toEqual([
      [false, false, false],
      [false, false],
    ]);
  });
});
