import type { ComarkElement, ComarkTree } from "comark";
import { describe, expect, it } from "vitest";

import {
  prepareExplicitTaskItems,
  promoteOrdinaryListItems,
  syncTaskItemState,
  taskItemIndexAttribute,
  taskItemLabelClassName,
} from "./task-item-tree";

function createTree(nodes: ComarkTree["nodes"]): ComarkTree {
  return {
    frontmatter: {},
    meta: {},
    nodes,
  };
}

describe("Task Item Tree", () => {
  it("prepares explicit Task Items with file-local indexes and clickable labels", () => {
    const checkbox: ComarkElement = [
      "input",
      {
        class: "task-list-item-checkbox",
        type: "checkbox",
        checked: true,
        disabled: true,
      },
    ];
    const tree = createTree([["li", { class: "task-list-item" }, checkbox, " Ship it"]]);

    expect(prepareExplicitTaskItems(tree)).toBe(1);

    expect(checkbox[1]).toMatchObject({
      class: "task-list-item-checkbox",
      type: "checkbox",
      [taskItemIndexAttribute]: "0",
    });
    expect(checkbox[1].checked).toBeUndefined();
    expect(checkbox[1].disabled).toBeUndefined();
    expect(JSON.stringify(tree.nodes)).toContain(`"class":"${taskItemLabelClassName}"`);
  });

  it("promotes ordinary list items into Task Items", () => {
    const tree = createTree([
      ["li", {}, "Install deps"],
      ["li", {}, ["ul", {}, ["li", {}, ""]]],
    ]);

    expect(promoteOrdinaryListItems(tree)).toBe(1);

    const treeJson = JSON.stringify(tree.nodes);
    expect(treeJson).toContain(`"${taskItemIndexAttribute}":"0"`);
    expect(treeJson).toContain(`"class":"${taskItemLabelClassName}"`);
    expect(treeJson).toContain("Install deps");
  });

  it("syncs Task Item State into prepared checkbox nodes", () => {
    const checkbox: ComarkElement = [
      "input",
      {
        class: "task-list-item-checkbox",
        type: "checkbox",
      },
    ];
    const tree = createTree([["li", { class: "task-list-item" }, checkbox, " Verify"]]);
    prepareExplicitTaskItems(tree);

    syncTaskItemState(tree, [true]);
    expect(checkbox[1].checked).toBe(true);

    syncTaskItemState(tree, [false]);
    expect(checkbox[1].checked).toBeUndefined();
  });
});
