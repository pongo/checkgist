import type { ComarkTree } from "comark";

import type {
  LoadError,
  LoadedSource,
  SourceFile,
  SourceFileId,
  SourceTextFile,
} from "@/source-services";

type ChecklistFileError = LoadError;

export type ChecklistReadyFile = {
  status: "ready";
  id: SourceFileId;
  sourceFile: SourceTextFile;
  tree: ComarkTree;
  checked: boolean[];
};

export type ChecklistErrorFile = {
  status: "error";
  id: SourceFileId;
  sourceFile: SourceFile;
  error: ChecklistFileError;
};

type ChecklistFile = ChecklistReadyFile | ChecklistErrorFile;

/**
 * Interactive rendering of a Loaded Source.
 *
 * Ready files carry parsed Markdown plus Checklist State. Error files stay in
 * the model so the UI can render partial failures without discarding the rest of
 * the Loaded Source.
 */
export type Checklist = {
  source: LoadedSource;
  files: ChecklistFile[];
  hasTaskItems: boolean;
};
