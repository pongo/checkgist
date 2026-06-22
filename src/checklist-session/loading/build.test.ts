import type { ComarkTree } from "comark";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LoadedSource } from "@/source-services/types";

import { buildChecklistSession } from "./build";

function createSource(files: LoadedSource["files"]): LoadedSource {
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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
    expect(JSON.stringify(file.tree.nodes)).toContain("checkgist-task-label");
    expect(JSON.stringify(file.tree.nodes)).not.toContain(":checked");
    expect(JSON.stringify(file.tree.nodes)).not.toContain(":disabled");
  });

  it("wraps Task Item checkboxes and inline text in labels", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "one.md",
          name: "one.md",
          content: "- [ ] Plain task\n- [ ] **Bold** task",
        },
      ]),
    );

    const file = session.files[0];
    expect(file?.status).toBe("ready");
    if (file?.status !== "ready") {
      return;
    }

    const treeJson = JSON.stringify(file.tree.nodes);
    expect(treeJson).toContain('["label",{"class":"checkgist-task-label"},["input"');
    expect(treeJson).toContain("Plain task");
    expect(treeJson).toContain("Bold");
  });

  it("wraps parent Task Item text in nested lists", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "nested.md",
          name: "nested.md",
          content:
            "- [x] Parent task\n  - [x] Sub-task done\n  - [ ] Sub-task pending\n- [ ] Another parent task",
        },
      ]),
    );

    const file = session.files[0];
    expect(file?.status).toBe("ready");
    if (file?.status !== "ready") {
      return;
    }

    expect(file.checked).toEqual([false, false, false, false]);
    const treeJson = JSON.stringify(file.tree.nodes);
    expect(treeJson).not.toContain('["p",{},["label",{"class":"checkgist-task-label"},["input"');
    expect(treeJson).toContain(
      '["li",{"class":"task-list-item"},["label",{"class":"checkgist-task-label"},["input"',
    );
    expect(treeJson).toContain("Parent task");
    expect(treeJson.match(/checkgist-task-label/g)).toHaveLength(4);
  });

  it("unwraps plain parent list item paragraphs before nested Task Items", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "nested.md",
          name: "nested.md",
          content:
            "- попросить:\n  - `не забудь таймкоды`\n  - [ ] для эпизодов нужны время и заголовки\n- после публикации:\n  - [ ] закрепить",
        },
      ]),
    );

    const file = session.files[0];
    expect(file?.status).toBe("ready");
    if (file?.status !== "ready") {
      return;
    }

    const treeJson = JSON.stringify(file.tree.nodes);
    expect(treeJson).toContain('["li",{},"попросить:",["ul",{"class":"contains-task-list"}');
    expect(treeJson).toContain('["li",{},"после публикации:",["ul",{"class":"contains-task-list"}');
    expect(treeJson).not.toContain('["li",{},["p",{},"попросить:"],["ul"');
    expect(treeJson).not.toContain('["li",{},["p",{},"после публикации:"],["ul"');
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

  it("converts ordinary list items to Task Items when Source Content has no explicit Task Items", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "one.md",
          name: "one.md",
          content: "- Install deps\n- Run tests\n  - Fix failures",
        },
        {
          status: "ready",
          id: "two.md",
          name: "two.md",
          content: "1. Deploy\n2. Verify logs",
        },
      ]),
    );

    expect(session.hasTaskItems).toBe(true);
    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [false, false, false],
    });
    expect(session.files[1]).toMatchObject({
      status: "ready",
      checked: [false, false],
    });

    const treeJson = JSON.stringify(
      session.files.flatMap((file) => (file.status === "ready" ? file.tree.nodes : [])),
    );
    expect(treeJson.match(/checkgist-task-label/g)).toHaveLength(5);
    expect(treeJson).toContain('"class":"task-list-item"');
    expect(treeJson).toContain('"data-checkgist-task-index"');
  });

  it("keeps ordinary list items unchanged when Source Content has explicit Task Items", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "explicit.md",
          name: "explicit.md",
          content: "- [ ] Explicit task",
        },
        {
          status: "ready",
          id: "ordinary.md",
          name: "ordinary.md",
          content: "- Plain list item",
        },
      ]),
    );

    expect(session.hasTaskItems).toBe(true);
    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [false],
    });
    expect(session.files[1]).toMatchObject({
      status: "ready",
      checked: [],
    });
    expect(
      JSON.stringify(session.files[1]?.status === "ready" ? session.files[1].tree.nodes : []),
    ).not.toContain("checkgist-task-label");
  });

  it("skips ordinary list items that only group nested list items", async () => {
    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "nested.md",
          name: "nested.md",
          content: "-\n  - Child task",
        },
      ]),
    );

    expect(session.hasTaskItems).toBe(true);
    expect(session.files[0]).toMatchObject({
      status: "ready",
      checked: [false],
    });
    expect(
      JSON.stringify(session.files[0]?.status === "ready" ? session.files[0].tree.nodes : []),
    ).toContain("Child task");
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

  it("rewrites supported Source URLs in Markdown links to Checkgist routes", async () => {
    vi.stubEnv("BASE_URL", "/checkgist/");

    const session = await buildChecklistSession(
      createSource([
        {
          status: "ready",
          id: "links.md",
          name: "links.md",
          content: [
            "[paste](https://pastebin.com/raw/abc)",
            "[gist](https://gist.github.com/user/def)",
            "[external](https://example.com)",
            "[relative](/pastebin.com/raw/abc)",
            "[anchor](#setup)",
          ].join("\n\n"),
        },
      ]),
    );

    const file = session.files[0];
    expect(file?.status).toBe("ready");
    if (file?.status !== "ready") {
      return;
    }

    const treeJson = JSON.stringify(file.tree.nodes);
    expect(treeJson).toContain('"href":"/checkgist/pastebin.com/abc"');
    expect(treeJson).toContain('"href":"/checkgist/gist.github.com/def"');
    expect(treeJson).toContain('"href":"https://example.com"');
    expect(treeJson).toContain('"href":"/pastebin.com/raw/abc"');
    expect(treeJson).toContain('"href":"#setup"');
    expect(treeJson.match(/"target":"_blank"/g)).toHaveLength(5);
    expect(treeJson.match(/"rel":"noopener noreferrer"/g)).toHaveLength(5);
  });
});
