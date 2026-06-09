import { parse } from "comark";
import type { ComarkElement, ComarkNode, ComarkTree, ParseOptions } from "comark";
import { defineComarkPlugin } from "comark";
import security from "comark/plugins/security";
import taskList from "comark/plugins/task-list";

import type { LoadedSource, SourceFile, SourceTextFile } from "@/source-services/types";

import { applySessionState } from "./state";
import { prepareExplicitTaskItems, promoteOrdinaryListItems } from "./task-item-tree";
import type { ChecklistErrorFile, ChecklistReadyFile, ChecklistSession } from "./types";

type ParseMarkdown = (markdown: string, options?: ParseOptions) => Promise<ComarkTree>;

export type BuildChecklistSessionOptions = {
  parseMarkdown?: ParseMarkdown;
  initialStateBits?: string | null;
};

const unsafeTags = ["script", "iframe", "object", "embed", "link", "style", "base", "meta"];

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
  source: LoadedSource,
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
        const taskItemCount = promoteOrdinaryListItems(file.tree);
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
    const taskItemCount = prepareExplicitTaskItems(tree);

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
