export type GitHubGistReference = {
  type: "github-gist";
  gistId: string;
};

export type PastebinReference = {
  type: "pastebin";
  pasteId: string;
};

/** Stable reference to a Local Document stored in this browser profile. */
export type LocalDocumentReference = {
  type: "local-document";
  documentId: string;
};

/**
 * Stable application reference to content on a supported Source Service.
 *
 * A Source Reference is safe to store in routes and use later to load the same
 * Source URL through the matching Source Service.
 */
export type SourceReference = GitHubGistReference | PastebinReference | LocalDocumentReference;

type SourceMetadata = {
  title: string;
  description?: string;
  url: string;
};

/**
 * Stable identifier for a Source File within a Loaded Source.
 */
export type SourceFileId = string;
type MarkdownContent = string;

/**
 * Recoverable load error attached to a Source File.
 */
export type LoadError = {
  message: string;
};

export class SourceLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceLoadError";
  }
}

/**
 * Source File whose Markdown-like text content is ready to render.
 */
export type SourceTextFile = {
  status: "ready";
  id: SourceFileId;
  name: string;
  content: MarkdownContent;
};

type SourceFileError = {
  status: "error";
  id: SourceFileId;
  name: string;
  error: LoadError;
};

/**
 * File-level result inside a Loaded Source.
 *
 * Individual Source Files can fail while other files from the same Loaded Source
 * remain renderable.
 */
export type SourceFile = SourceTextFile | SourceFileError;

/**
 * Resolved content loaded from a Source URL.
 *
 * A Loaded Source can contain multiple Source Files. Individual files may fail
 * while the Source itself still loads successfully.
 */
export type LoadedSource = {
  reference: SourceReference;
  metadata: SourceMetadata;
  files: SourceFile[];
};

export type SourceFetcher = <TResponse>(
  url: string,
  options?: { signal?: AbortSignal },
) => Promise<TResponse>;

export type SourceLoadOptions = {
  signal?: AbortSignal;
  fetcher?: SourceFetcher;
};

/**
 * Adapter contract for a supported external Source Service.
 *
 * Implementations own loading the referenced content into a Loaded Source.
 * Source URL and app route grammar lives in the Source Addressing module.
 */
export type SourceService<TReference extends SourceReference> = {
  type: TReference["type"];
  load(reference: TReference, options?: SourceLoadOptions): Promise<LoadedSource>;
};
