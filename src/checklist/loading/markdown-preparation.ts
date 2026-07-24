import { parse } from "comark";
import type { ComarkTree, ParseOptions } from "comark";
import { defineComarkPlugin } from "comark";
import security from "comark/plugins/security";
import taskList from "comark/plugins/task-list";

import { routeForUrlInput } from "@/source-services";

import { prepareExplicitTaskItems } from "../task-items/task-item-tree";

type ParseMarkdown = (markdown: string, options?: ParseOptions) => Promise<ComarkTree>;

/** The renderer-ready Markdown tree and its explicit Task Item count. */
export type PreparedMarkdown = {
  tree: ComarkTree;
  taskItemCount: number;
};

const unsafeTags = ["script", "iframe", "object", "embed", "link", "style", "base", "meta"];

const checklistMarkdownPlugins = [
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
          node[1].href = rewriteSupportedSourceLink(node[1].href);
          node[1].target = "_blank";
          node[1].rel = "noopener noreferrer";
        }
      });
    },
  }))(),
] as const;

/** Parses and prepares Markdown according to the shared Checklist rendering policy. */
export async function prepareMarkdown(
  markdown: string,
  parseMarkdown: ParseMarkdown = parse,
): Promise<PreparedMarkdown> {
  const tree = await parseMarkdown(markdown, { plugins: checklistMarkdownPlugins });
  return { tree, taskItemCount: prepareExplicitTaskItems(tree) };
}

function rewriteSupportedSourceLink(href: string): string {
  if (!isAbsoluteHttpUrl(href)) return href;
  const route = routeForUrlInput(href);
  return route === null ? href : hrefForAppRoute(route);
}

function isAbsoluteHttpUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hrefForAppRoute(route: string): string {
  const baseUrl = import.meta.env.BASE_URL;
  return baseUrl === "/" ? route : `${baseUrl.replace(/\/$/, "")}${route}`;
}

function visitNodes(nodes: ComarkNode[], visit: (node: ComarkNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (isElement(node)) visitNodes(elementChildren(node), visit);
  }
}

function isElement(node: ComarkNode): node is ComarkElement {
  return Array.isArray(node) && node[0] !== null;
}

function elementChildren(node: ComarkElement): ComarkNode[] {
  return node.slice(2) as ComarkNode[];
}

import type { ComarkElement, ComarkNode } from "comark";
