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

  it("keeps nested list structure outside an explicit Task Item label", () => {
    const checkbox: ComarkElement = [
      "input",
      { class: "task-list-item-checkbox", type: "checkbox" },
    ];
    const nestedList: ComarkElement = ["ul", {}, ["li", {}, "Follow-up"]];
    const tree = createTree([
      ["li", { class: "task-list-item" }, checkbox, " Ship release", nestedList],
    ]);

    expect(prepareExplicitTaskItems(tree)).toBe(1);
    expect(tree.nodes).toEqual([
      [
        "li",
        { class: "task-list-item" },
        [
          "label",
          { class: taskItemLabelClassName },
          [
            "input",
            {
              class: "task-list-item-checkbox",
              type: "checkbox",
              [taskItemIndexAttribute]: "0",
            },
          ],
          " Ship release",
        ],
        nestedList,
      ],
    ]);
  });

  it("does not create an empty label for an explicit Task Item without inline content", () => {
    const checkbox: ComarkElement = [
      "input",
      { class: "task-list-item-checkbox", type: "checkbox" },
    ];
    const tree = createTree([["li", { class: "task-list-item" }, checkbox]]);

    expect(prepareExplicitTaskItems(tree)).toBe(1);
    expect(tree.nodes).toEqual([
      [
        "li",
        { class: "task-list-item" },
        [
          "input",
          {
            class: "task-list-item-checkbox",
            type: "checkbox",
            [taskItemIndexAttribute]: "0",
          },
        ],
      ],
    ]);
  });

  it("does not turn non-list checkbox-like elements into explicit Task Items", () => {
    const tree = createTree([
      [
        "li",
        { class: "task-list-item" },
        ["input", { class: "task-list-item-checkbox", type: "text" }],
      ],
      [
        "li",
        { class: "task-list-item" },
        ["button", { class: "task-list-item-checkbox", type: "checkbox" }],
      ],
      ["li", { class: "task-list-item" }, ["input", { class: "other-checkbox", type: "checkbox" }]],
    ]);

    expect(prepareExplicitTaskItems(tree)).toBe(0);
    expect(JSON.stringify(tree.nodes)).not.toContain(taskItemIndexAttribute);
  });

  it("promotes paragraph content without discarding existing list item classes", () => {
    const tree = createTree([
      ["li", { class: "  " }, ["p", {}, "Set up project"]],
      ["li", { class: "  custom-list-item  " }, ["p", {}, "Install deps"]],
    ]);

    expect(promoteOrdinaryListItems(tree)).toBe(2);

    expect(tree.nodes).toEqual([
      [
        "li",
        { class: "task-list-item" },
        [
          "label",
          { class: taskItemLabelClassName },
          [
            "input",
            {
              class: "task-list-item-checkbox",
              type: "checkbox",
              [taskItemIndexAttribute]: "0",
            },
          ],
          "Set up project",
        ],
      ],
      [
        "li",
        { class: " custom-list-item  task-list-item" },
        [
          "label",
          { class: taskItemLabelClassName },
          [
            "input",
            {
              class: "task-list-item-checkbox",
              type: "checkbox",
              [taskItemIndexAttribute]: "1",
            },
          ],
          "Install deps",
        ],
      ],
    ]);
  });

  it("does not promote whitespace-only list items", () => {
    const tree = createTree([["li", {}, " \n  "]]);

    expect(promoteOrdinaryListItems(tree)).toBe(0);
    expect(tree.nodes).toEqual([["li", {}, " \n  "]]);
  });

  it("keeps paragraphs before non-list blocks intact", () => {
    const tree = createTree([
      ["li", {}, ["p", {}, "Release notes"], ["blockquote", {}, "Context"]],
    ]);

    expect(prepareExplicitTaskItems(tree)).toBe(0);
    expect(tree.nodes).toEqual([
      ["li", {}, ["p", {}, "Release notes"], ["blockquote", {}, "Context"]],
    ]);
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

  it("only syncs state to indexed input nodes with an integer Task Item index", () => {
    const preparedCheckbox: ComarkElement = [
      "input",
      { type: "checkbox", [taskItemIndexAttribute]: "0" },
    ];
    const fractionalIndexCheckbox: ComarkElement = [
      "input",
      { type: "checkbox", [taskItemIndexAttribute]: "0.5" },
    ];
    const unpreparedInput: ComarkElement = ["input", { type: "checkbox" }];
    const indexedContainer: ComarkElement = ["div", { [taskItemIndexAttribute]: "0" }];
    const tree = createTree([
      preparedCheckbox,
      fractionalIndexCheckbox,
      unpreparedInput,
      indexedContainer,
    ]);

    syncTaskItemState(tree, [true]);

    expect(preparedCheckbox[1].checked).toBe(true);
    expect(fractionalIndexCheckbox[1].checked).toBeUndefined();
    expect(unpreparedInput[1].checked).toBeUndefined();
    expect(indexedContainer[1].checked).toBeUndefined();
  });

  describe("DOM queries", () => {
    it("reads the file-local Task Item index from a rendered checkbox", () => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.setAttribute(taskItemIndexAttribute, "3");

      expect(taskItemIndexFromCheckboxElement(checkbox)).toBe(3);

      checkbox.setAttribute(taskItemIndexAttribute, "not-an-index");
      expect(taskItemIndexFromCheckboxElement(checkbox)).toBeNull();

      checkbox.setAttribute(taskItemIndexAttribute, "3.5");
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
