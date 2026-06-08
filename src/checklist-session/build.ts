import { parse } from "comark";
import type { ComarkElement, ComarkNode, ComarkTree, ParseOptions } from "comark";
import { defineComarkPlugin } from "comark";
import security from "comark/plugins/security";
import taskList from "comark/plugins/task-list";

import type { SourceContent, SourceFile, SourceTextFile } from "@/source-services/types";

import { applySessionState } from "./state";
import type { ChecklistErrorFile, ChecklistReadyFile, ChecklistSession } from "./types";

type ParseMarkdown = (markdown: string, options?: ParseOptions) => Promise<ComarkTree>;

export type BuildChecklistSessionOptions = {
  parseMarkdown?: ParseMarkdown;
  initialStateBits?: string | null;
};

const unsafeTags = ["script", "iframe", "object", "embed", "link", "style", "base", "meta"];
const blockTags = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "div",
  "dl",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul",
]);

export const checklistMarkdownPlugins = [
  taskList({ enabled: true }),
  security({
    blockedTags: unsafeTags,
    allowedProtocols: ["http", "https", "mailto"],
    allowDataImages: false,
  }),
  defineComarkPlugin(() => ({
    name: "external-link-targets",
    post(state) {
      visitNodes(state.tree.nodes, (node) => {
        if (isElement(node) && node[0] === "a" && typeof node[1].href === "string") {
          node[1].target = "_blank";
          node[1].rel = "noopener noreferrer";
        }
      });
    },
  }))(),
] as const;

export async function buildChecklistSession(
  source: SourceContent,
  options: BuildChecklistSessionOptions = {},
): Promise<ChecklistSession> {
  const parseMarkdown = options.parseMarkdown ?? parse;
  const files = await Promise.all(
    source.files.map((sourceFile) => buildChecklistFile(sourceFile, parseMarkdown)),
  );
  const hasExplicitTaskItems = files.some(
    (file) => file.status === "ready" && file.checked.length > 0,
  );

  if (!hasExplicitTaskItems) {
    for (const file of files) {
      if (file.status === "ready") {
        const taskItemCount = prepareOrdinaryListItems(file.tree);
        file.checked = Array.from({ length: taskItemCount }, () => false);
      }
    }
  }

  const session = {
    source,
    files,
    hasTaskItems: files.some((file) => file.status === "ready" && file.checked.length > 0),
  };

  applySessionState(session, options.initialStateBits);
  return session;
}

async function buildChecklistFile(
  sourceFile: SourceFile,
  parseMarkdown: ParseMarkdown,
): Promise<ChecklistReadyFile | ChecklistErrorFile> {
  if (sourceFile.status === "error") {
    return {
      status: "error",
      id: sourceFile.id,
      sourceFile,
      error: sourceFile.error,
    };
  }

  try {
    const tree = await parseMarkdown(sourceFile.content, {
      plugins: checklistMarkdownPlugins,
    });
    const taskItemCount = prepareTaskItems(tree);

    return {
      status: "ready",
      id: sourceFile.id,
      sourceFile,
      tree,
      checked: Array.from({ length: taskItemCount }, () => false),
    };
  } catch {
    return createChecklistFileError(sourceFile, "Failed to parse this source file as Markdown.");
  }
}

function createChecklistFileError(sourceFile: SourceTextFile, message: string): ChecklistErrorFile {
  return {
    status: "error",
    id: sourceFile.id,
    sourceFile,
    error: { message },
  };
}

function prepareTaskItems(tree: ComarkTree): number {
  let taskItemIndex = 0;

  visitNodes(tree.nodes, (node) => {
    if (isTaskListItem(node)) {
      taskItemIndex = prepareTaskItemLabel(node, taskItemIndex);
    } else if (isTaskCheckbox(node)) {
      if (node[1]["data-checkgist-task-index"] === undefined) {
        prepareTaskCheckbox(node, taskItemIndex);
        taskItemIndex += 1;
      }
    }
  });

  return taskItemIndex;
}

function prepareOrdinaryListItems(tree: ComarkTree): number {
  let taskItemIndex = 0;

  visitNodes(tree.nodes, (node) => {
    if (!isOrdinaryListItem(node)) {
      return;
    }

    const taskContent = findOrdinaryListItemContent(node);
    if (taskContent === null) {
      return;
    }

    const checkbox = createTaskCheckbox();
    prepareTaskCheckbox(checkbox, taskItemIndex);

    const labelChildren: ComarkNode[] = [checkbox, ...taskContent.labelChildren];
    taskContent.container.splice(
      taskContent.startIndex,
      taskContent.endIndex - taskContent.startIndex,
      ["label", { class: "checkgist-task-label" }, ...labelChildren],
    );
    addClassName(node, "task-list-item");
    unwrapLeadingTaskItemParagraph(node, taskContent.container);
    taskItemIndex += 1;
  });

  return taskItemIndex;
}

function prepareTaskItemLabel(node: ComarkElement, taskItemIndex: number): number {
  const taskContent = findTaskItemContent(node);
  if (taskContent === null) {
    return taskItemIndex;
  }

  prepareTaskCheckbox(taskContent.checkbox, taskItemIndex);

  const labelChildren: ComarkNode[] = [taskContent.checkbox];
  let nextChildIndex = taskContent.checkboxIndex + 1;
  while (
    nextChildIndex < taskContent.container.length &&
    isTaskLabelContent(taskContent.container[nextChildIndex] as ComarkNode)
  ) {
    labelChildren.push(taskContent.container[nextChildIndex] as ComarkNode);
    nextChildIndex += 1;
  }

  if (labelChildren.length > 1) {
    taskContent.container.splice(
      taskContent.checkboxIndex,
      nextChildIndex - taskContent.checkboxIndex,
      ["label", { class: "checkgist-task-label" }, ...labelChildren],
    );
  }

  unwrapLeadingTaskItemParagraph(node, taskContent.container);

  return taskItemIndex + 1;
}

function unwrapLeadingTaskItemParagraph(taskItem: ComarkElement, container: ComarkElement): void {
  const firstContentNode = taskItem[2] as ComarkNode | undefined;
  if (firstContentNode !== container || container[0] !== "p") {
    return;
  }

  taskItem.splice(2, 1, ...elementChildren(container));
}

function findTaskItemContent(node: ComarkElement): {
  container: ComarkElement;
  checkbox: ComarkElement;
  checkboxIndex: number;
} | null {
  const directCheckbox = findDirectTaskCheckbox(node);
  if (directCheckbox !== null) {
    return { container: node, ...directCheckbox };
  }

  const firstContentNode = node[2] as ComarkNode | undefined;
  if (
    firstContentNode !== undefined &&
    isElement(firstContentNode) &&
    firstContentNode[0] === "p"
  ) {
    const paragraphCheckbox = findDirectTaskCheckbox(firstContentNode);
    if (paragraphCheckbox !== null) {
      return { container: firstContentNode, ...paragraphCheckbox };
    }
  }

  return null;
}

function findOrdinaryListItemContent(node: ComarkElement): {
  container: ComarkElement;
  labelChildren: ComarkNode[];
  startIndex: number;
  endIndex: number;
} | null {
  const firstContentNode = node[2] as ComarkNode | undefined;
  if (
    firstContentNode !== undefined &&
    isElement(firstContentNode) &&
    firstContentNode[0] === "p"
  ) {
    const paragraphContent = findListItemLabelContent(firstContentNode);
    if (paragraphContent !== null) {
      return { container: firstContentNode, ...paragraphContent };
    }
  }

  const directContent = findListItemLabelContent(node);
  if (directContent !== null) {
    return { container: node, ...directContent };
  }

  return null;
}

function findListItemLabelContent(node: ComarkElement): {
  labelChildren: ComarkNode[];
  startIndex: number;
  endIndex: number;
} | null {
  let startIndex = 2;
  while (startIndex < node.length && !isTaskLabelContent(node[startIndex] as ComarkNode)) {
    startIndex += 1;
  }

  let endIndex = startIndex;
  while (endIndex < node.length && isTaskLabelContent(node[endIndex] as ComarkNode)) {
    endIndex += 1;
  }

  const labelChildren = node.slice(startIndex, endIndex) as ComarkNode[];
  if (!hasTaskLabelText(labelChildren)) {
    return null;
  }

  return { labelChildren, startIndex, endIndex };
}

function findDirectTaskCheckbox(node: ComarkElement): {
  checkbox: ComarkElement;
  checkboxIndex: number;
} | null {
  for (let childIndex = 2; childIndex < node.length; childIndex += 1) {
    const child = node[childIndex] as ComarkNode;
    if (isTaskCheckbox(child)) {
      return { checkbox: child, checkboxIndex: childIndex };
    }
  }

  return null;
}

function createTaskCheckbox(): ComarkElement {
  return [
    "input",
    {
      class: "task-list-item-checkbox",
      type: "checkbox",
    },
  ];
}

function prepareTaskCheckbox(checkbox: ComarkElement, taskItemIndex: number): void {
  checkbox[1]["data-checkgist-task-index"] = String(taskItemIndex);
  delete checkbox[1][":checked"];
  delete checkbox[1].checked;
  delete checkbox[1][":disabled"];
  delete checkbox[1].disabled;
}

function addClassName(node: ComarkElement, className: string): void {
  const currentClassName = node[1].class;
  if (typeof currentClassName !== "string" || currentClassName.trim().length === 0) {
    node[1].class = className;
    return;
  }

  const classNames = currentClassName.split(/\s+/);
  if (!classNames.includes(className)) {
    node[1].class = [...classNames, className].join(" ");
  }
}

function hasTaskLabelText(nodes: ComarkNode[]): boolean {
  return nodes.some((node) => {
    if (typeof node === "string") {
      return node.trim().length > 0;
    }

    if (!isElement(node)) {
      return false;
    }

    return hasTaskLabelText(elementChildren(node));
  });
}

function isTaskLabelContent(node: ComarkNode): boolean {
  return !isElement(node) || !blockTags.has(node[0]);
}

function isTaskCheckbox(node: ComarkNode): node is ComarkElement {
  if (!isElement(node)) {
    return false;
  }

  const className = node[1].class;
  return (
    node[0] === "input" &&
    node[1].type === "checkbox" &&
    typeof className === "string" &&
    className.split(/\s+/).includes("task-list-item-checkbox")
  );
}

function isTaskListItem(node: ComarkNode): node is ComarkElement {
  if (!isElement(node) || node[0] !== "li") {
    return false;
  }

  const className = node[1].class;
  return typeof className === "string" && className.split(/\s+/).includes("task-list-item");
}

function isOrdinaryListItem(node: ComarkNode): node is ComarkElement {
  return isElement(node) && node[0] === "li" && !isTaskListItem(node);
}

function visitNodes(nodes: ComarkNode[], visit: (node: ComarkNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (isElement(node)) {
      visitNodes(elementChildren(node), visit);
    }
  }
}

function isElement(node: ComarkNode): node is ComarkElement {
  return Array.isArray(node) && node[0] !== null;
}

function elementChildren(node: ComarkElement): ComarkNode[] {
  return node.slice(2) as ComarkNode[];
}
