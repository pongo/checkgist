import type { ComarkTree } from "comark";
import { describe, expect, it } from "vitest";

import type { SourceContent } from "@/source-services/types";

import { buildChecklistSession } from "./build";

function createSource(files: SourceContent["files"]): SourceContent {
  return {
    reference: { type: "pastebin", pasteId: "source-1" },
    metadata: {
      title: "source-1",
      url: "https://pastebin.com/source-1",
    },
    files,
  };
}

describe("buildChecklistSession", () => {
  it("parses ready Source Files and stores unchecked local Task Item State", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "one.md",
          name: "one.md",
          content: "- [x] Done\n- [X] Also done\n- [ ] Todo",
        },
      ]),
    );

    expect(session.hasTaskItems).toBe(true);
    expect(session.files).toHaveLength(1);
    const file = session.files[0];
    expect(file?.status).toBe("ready");
    if (file?.status !== "ready") {
      return;
    }

    expect(file.checked).toEqual([false, false, false]);
    expect(JSON.stringify(file.tree.nodes)).toContain("data-checkgist-task-index");
    expect(JSON.stringify(file.tree.nodes)).not.toContain(":checked");
  });

  it("renders Markdown content that has no Task Items", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "notes.md",
          name: "notes.md",
          content: "# Notes\n\nPlain Markdown.",
        },
      ]),
    );

    expect(session.hasTaskItems).toBe(false);
    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [],
    });
  });

  it("converts Source File errors to Checklist File errors", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "error",
          id: "broken.md",
          name: "broken.md",
          error: { message: "Raw file failed." },
        },
      ]),
    );

    expect(session.files).toEqual([
      {
        status: "error",
        id: "broken.md",
        sourceFile: {
          status: "error",
          id: "broken.md",
          name: "broken.md",
          error: { message: "Raw file failed." },
        },
        error: { message: "Raw file failed." },
      },
    ]);
    expect(session.hasTaskItems).toBe(false);
  });

  it("converts parse failures for one file without hiding other files", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "bad.md",
          name: "bad.md",
          content: "bad",
        },
        {
          status: "ready",
          id: "good.md",
          name: "good.md",
          content: "- [ ] good",
        },
      ]),
      {
        parseMarkdown: async (markdown): Promise<ComarkTree> => {
          if (markdown === "bad") {
            throw new Error("parse failed");
          }

          return {
            frontmatter: {},
            meta: {},
            nodes: [
              [
                "input",
                {
                  class: "task-list-item-checkbox",
                  type: "checkbox",
                },
              ],
            ],
          };
        },
      },
    );

    expect(session.files[0]).toMatchObject({
      status: "error",
      id: "bad.md",
      error: { message: "Failed to parse this source file as Markdown." },
    });
    expect(session.files[1]).toMatchObject({
      status: "ready",
      id: "good.md",
      checked: [false],
    });
    expect(session.hasTaskItems).toBe(true);
  });

  it("sanitizes unsafe HTML, preserves allowed images, and updates external links", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "safe.md",
          name: "safe.md",
          content:
            '[site](https://example.com)\n\n<img src="https://example.com/image.png">\n\n<img src="data:image/png;base64,abc">\n\n<script>alert(1)</script>',
        },
      ]),
    );

    const file = session.files[0];
    expect(file?.status).toBe("ready");
    if (file?.status !== "ready") {
      return;
    }

    const treeJson = JSON.stringify(file.tree.nodes);
    expect(treeJson).toContain('"target":"_blank"');
    expect(treeJson).toContain('"rel":"noopener noreferrer"');
    expect(treeJson).toContain("https://example.com/image.png");
    expect(treeJson).not.toContain("data:image/png");
    expect(treeJson).not.toContain("script");
    expect(treeJson).not.toContain("alert(1)");
  });
});
