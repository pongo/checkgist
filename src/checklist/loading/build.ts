import type { ComarkTree, ParseOptions } from "comark";

import type { LoadedSource, SourceFile, SourceTextFile } from "@/source-services";

import { promoteOrdinaryListItems } from "../task-items/task-item-tree";
import type { ChecklistErrorFile, ChecklistReadyFile, Checklist } from "../types";
import { prepareMarkdown } from "./markdown-preparation";

type ParseMarkdown = (markdown: string, options?: ParseOptions) => Promise<ComarkTree>;

export type BuildChecklistOptions = {
  parseMarkdown?: ParseMarkdown;
};

export async function buildChecklist(
  source: LoadedSource,
  options: BuildChecklistOptions = {},
): Promise<Checklist> {
  const files = await Promise.all(
    source.files.map((sourceFile) => buildChecklistFile(sourceFile, options.parseMarkdown)),
  );
  const hasExplicitTaskItems = files.some(
    (file) => file.status === "ready" && file.checked.length > 0,
  );

  if (!hasExplicitTaskItems) {
    for (const file of files) {
      if (file.status !== "ready") continue;
      const taskItemCount = promoteOrdinaryListItems(file.tree);
      file.checked = Array.from({ length: taskItemCount }, () => false);
    }
  }

  return {
    source,
    files,
    hasTaskItems: files.some((file) => file.status === "ready" && file.checked.length > 0),
  };
}

async function buildChecklistFile(
  sourceFile: SourceFile,
  parseMarkdown?: ParseMarkdown,
): Promise<ChecklistReadyFile | ChecklistErrorFile> {
  if (sourceFile.status === "error") {
    return { status: "error", id: sourceFile.id, sourceFile, error: sourceFile.error };
  }

  try {
    const { tree, taskItemCount } = await prepareMarkdown(sourceFile.content, parseMarkdown);
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
  return { status: "error", id: sourceFile.id, sourceFile, error: { message } };
}
