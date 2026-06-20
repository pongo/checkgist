import type { ComarkTree } from "comark";

import type {
  LoadError,
  LoadedSource,
  SourceFile,
  SourceFileId,
  SourceTextFile,
} from "@/source-services";

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
  source: LoadedSource;
  files: ChecklistFile[];
  hasTaskItems: boolean;
};
