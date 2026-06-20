import { describe, expect, it, vi } from "vitest";

import {
  applyBitsToSession,
  bitsFromHash,
  bitsFromSession,
  bitsToHash,
  listenToHash,
  parseBits,
} from "./state-codec";
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

describe("Checklist State codec", () => {
  it.each([undefined, null, "", "10a01", "#101"])(
    "treats missing, empty, invalid, or hash-form bits as all unchecked: %s",
    (bits) => {
      const session = createSession();

      applyBitsToSession(session, parseBits(bits));

      expect(readyChecked(session)).toEqual([
        [false, false, false],
        [false, false],
      ]);
    },
  );

  it("decodes valid bits in ready file order and skips error files", () => {
    const session = createSession();

    applyBitsToSession(session, "10101");

    expect(readyChecked(session)).toEqual([
      [true, false, true],
      [false, true],
    ]);
  });

  it("treats missing valid positions as unchecked and ignores extra positions", () => {
    const session = createSession();

    applyBitsToSession(session, "1");

    expect(readyChecked(session)).toEqual([
      [true, false, false],
      [false, false],
    ]);

    applyBitsToSession(session, "010111111");

    expect(readyChecked(session)).toEqual([
      [false, true, false],
      [true, true],
    ]);
  });

  it("encodes ready files in order, ignores error files, and trims only global trailing zeroes", () => {
    const session = createSession();
    applyBitsToSession(session, "10100");

    expect(bitsFromSession(session)).toBe("101");

    applyBitsToSession(session, "10010");

    expect(bitsFromSession(session)).toBe("1001");
  });

  it("converts between bits and browser hash transport", () => {
    expect(parseBits("101")).toBe("101");
    expect(parseBits("#101")).toBe("");
    expect(parseBits("10x")).toBe("");
    expect(bitsFromHash("#101")).toBe("101");
    expect(bitsFromHash("101")).toBe("");
    expect(bitsFromHash("#10x")).toBe("");
    expect(bitsToHash("101")).toBe("#101");
    expect(bitsToHash("")).toBe("");
    expect(bitsToHash("#101")).toBe("");
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

    const stop = listenToHash(() => session, target, location);
    listeners.get("hashchange")?.(new Event("hashchange"));

    expect(readyChecked(session)).toEqual([
      [false, true, false],
      [false, false],
    ]);

    stop();

    expect(listeners.has("hashchange")).toBe(false);
  });
});
