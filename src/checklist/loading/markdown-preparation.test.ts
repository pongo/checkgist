import { describe, expect, it } from "vitest";

import { prepareMarkdown } from "./markdown-preparation";

describe("prepareMarkdown", () => {
  it("returns a prepared tree and explicit task count", async () => {
    const { tree, taskItemCount } = await prepareMarkdown("- [x] Done\n- [ ] Todo");

    expect(taskItemCount).toBe(2);
    const treeJson = JSON.stringify(tree.nodes);
    expect(treeJson).toContain("data-checkgist-task-index");
    expect(treeJson).not.toContain(":checked");
    expect(treeJson).not.toContain(":disabled");
  });

  it("applies security and link policy before returning the tree", async () => {
    const { tree } = await prepareMarkdown(
      '<script>alert("unsafe")</script><a href="javascript:alert(1)">Link</a>',
    );

    const treeJson = JSON.stringify(tree.nodes);
    expect(treeJson).not.toContain('["script"');
    expect(treeJson).not.toContain("javascript:");
  });
});
