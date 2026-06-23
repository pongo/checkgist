export type GitHubGistReference = {
  type: "github-gist";
  gistId: string;
};

export type PastebinReference = {
  type: "pastebin";
  pasteId: string;
};

/**
 * Stable application reference to content on a supported Source Service.
 *
 * A Source Reference is safe to store in routes and use later to load the same
 * Source URL through the matching Source Service.
 */
export type SourceReference = GitHubGistReference | PastebinReference;

type SourceMetadata = {
  title: string;
  description?: string;
  url: string;
};

export type SourceFileId = string;
type MarkdownContent = string;

export type LoadError = {
  message: string;
};

export class SourceLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceLoadError";
  }
}

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
 * Implementations own parsing Source URLs, mapping references to app routes,
 * and loading the referenced content into a Loaded Source.
 */
export type SourceService<TReference extends SourceReference> = {
  type: TReference["type"];
  fromUrl(url: URL): TReference | null;
  fromRoute(path: string[]): TReference | null;
  toRoute(reference: TReference): string[];
  load(reference: TReference, options?: SourceLoadOptions): Promise<LoadedSource>;
};
