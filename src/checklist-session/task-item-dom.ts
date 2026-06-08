import { taskItemIndexAttribute, taskItemLabelClassName } from "./task-item-tree";

export function taskItemIndexFromCheckboxElement(element: HTMLInputElement): number | null {
  const taskIndexValue = element.getAttribute(taskItemIndexAttribute);
  if (taskIndexValue === null) {
    return null;
  }

  const taskIndex = Number(taskIndexValue);
  return Number.isInteger(taskIndex) ? taskIndex : null;
}

export function findTaskItemLabelElement(target: HTMLElement): HTMLLabelElement | null {
  const label = target.closest(`.${taskItemLabelClassName}`);
  return label instanceof HTMLLabelElement ? label : null;
}
