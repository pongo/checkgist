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
      taskItemIndex = prepareTaskItemLabels(node, taskItemIndex);
    } else if (isTaskCheckbox(node)) {
      if (node[1]["data-checkgist-task-index"] === undefined) {
        prepareTaskCheckbox(node, taskItemIndex);
        taskItemIndex += 1;
      }
    }
  });

  return taskItemIndex;
}

function prepareTaskItemLabels(node: ComarkElement, taskItemIndex: number): number {
  let nextTaskItemIndex = taskItemIndex;

  for (let childIndex = 2; childIndex < node.length; childIndex += 1) {
    const child = node[childIndex] as ComarkNode;
    if (!isTaskCheckbox(child)) {
      continue;
    }

    prepareTaskCheckbox(child, nextTaskItemIndex);

    const labelChildren: ComarkNode[] = [child];
    let nextChildIndex = childIndex + 1;
    while (nextChildIndex < node.length && isTaskLabelContent(node[nextChildIndex] as ComarkNode)) {
      labelChildren.push(node[nextChildIndex] as ComarkNode);
      nextChildIndex += 1;
    }

    if (labelChildren.length > 1) {
      node.splice(childIndex, nextChildIndex - childIndex, [
        "label",
        { class: "checkgist-task-label" },
        ...labelChildren,
      ]);
    }

    nextTaskItemIndex += 1;
  }

  return nextTaskItemIndex;
}

function prepareTaskCheckbox(checkbox: ComarkElement, taskItemIndex: number): void {
  checkbox[1]["data-checkgist-task-index"] = String(taskItemIndex);
  delete checkbox[1][":checked"];
  delete checkbox[1].checked;
  delete checkbox[1][":disabled"];
  delete checkbox[1].disabled;
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
