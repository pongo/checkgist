export type GitHubGistReference = {
  type: "github-gist";
  gistId: string;
};

export type PastebinReference = {
  type: "pastebin";
  pasteId: string;
};

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

export type SourceService<TReference extends SourceReference> = {
  type: TReference["type"];
  fromUrl(url: URL): TReference | null;
  fromRoute(path: string[]): TReference | null;
  toRoute(reference: TReference): string[];
  load(reference: TReference, options?: SourceLoadOptions): Promise<LoadedSource>;
};
