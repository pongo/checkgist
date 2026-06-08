import { describe, expect, it } from "vitest";

import { findTaskItemLabelElement, taskItemIndexFromCheckboxElement } from "./task-item-dom";
import { taskItemIndexAttribute, taskItemLabelClassName } from "./task-item-tree";

describe("Task Item DOM adapter", () => {
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
