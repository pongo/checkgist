import { describe, expect, it } from "vitest";

import type { ChecklistSession } from "./types";
import {
  applySessionState,
  encodeSessionState,
  parseStateBits,
  resetAll,
  resetFile,
  setTaskChecked,
} from "./state";

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
  it.each([undefined, null, "", "#", "10a01", "#10a01"])(
    "treats missing, empty, or invalid state as all unchecked: %s",
    (stateBits) => {
      const session = createSession();

      applySessionState(session, stateBits);

      expect(readyChecked(session)).toEqual([
        [false, false, false],
        [false, false],
      ]);
    },
  );

  it("decodes valid bits in ready file order and skips error files", () => {
    const session = createSession();

    applySessionState(session, "#10101");

    expect(readyChecked(session)).toEqual([
      [true, false, true],
      [false, true],
    ]);
  });

  it("treats missing valid positions as unchecked and ignores extra positions", () => {
    const session = createSession();

    applySessionState(session, "1");

    expect(readyChecked(session)).toEqual([
      [true, false, false],
      [false, false],
    ]);

    applySessionState(session, "010111111");

    expect(readyChecked(session)).toEqual([
      [false, true, false],
      [true, true],
    ]);
  });

  it("encodes ready files in order, ignores error files, and trims only global trailing zeroes", () => {
    const session = createSession();
    applySessionState(session, "10100");

    expect(encodeSessionState(session)).toBe("101");

    applySessionState(session, "10010");

    expect(encodeSessionState(session)).toBe("1001");
  });

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
    applySessionState(session, "11111");

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

  it("normalizes hash-form state bits", () => {
    expect(parseStateBits("#101")).toBe("101");
    expect(parseStateBits("101")).toBe("101");
    expect(parseStateBits("#10x")).toBe("");
  });
});
