import type { ComarkElement, ComarkTree } from "comark";
import { describe, expect, it } from "vitest";

import {
  findTaskItemLabelElement,
  prepareExplicitTaskItems,
  promoteOrdinaryListItems,
  syncTaskItemState,
  taskItemIndexFromCheckboxElement,
} from "./task-item-tree";

// Public DOM contract: rendered checkbox attribute and label class.
const taskItemIndexAttribute = "data-checkgist-task-index";
const taskItemLabelClassName = "checkgist-task-label";

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

  describe("DOM queries", () => {
    it("reads the file-local Task Item index from a rendered checkbox", () => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.setAttribute(taskItemIndexAttribute, "3");

      expect(taskItemIndexFromCheckboxElement(checkbox)).toBe(3);

      checkbox.setAttribute(taskItemIndexAttribute, "not-an-index");
      expect(taskItemIndexFromCheckboxElement(checkbox)).toBeNull();

      checkbox.removeAttribute(taskItemIndexAttribute);
      expect(taskItemIndexFromCheckboxElement(checkbox)).toBeNull();
    });

    it("finds the rendered Task Item label for clicked label content", () => {
      const label = document.createElement("label");
      label.className = taskItemLabelClassName;
      const text = document.createElement("span");
      label.append(text);

      expect(findTaskItemLabelElement(text)).toBe(label);
      expect(findTaskItemLabelElement(document.createElement("span"))).toBeNull();
    });
  });
});
