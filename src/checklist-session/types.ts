import type { ComarkTree } from "comark";

import type {
  LoadError,
  SourceContent,
  SourceFile,
  SourceFileId,
  SourceTextFile,
} from "@/source-services/types";

export type ChecklistFileError = LoadError;

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

export type ChecklistFile = ChecklistReadyFile | ChecklistErrorFile;

export type ChecklistSession = {
  source: SourceContent;
  files: ChecklistFile[];
  hasTaskItems: boolean;
};
