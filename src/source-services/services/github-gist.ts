import { directSourceFetcher } from "../fetcher.ts";
import type {
  GitHubGistReference,
  SourceFile,
  LoadedSource,
  SourceLoadOptions,
  SourceService,
} from "../types.ts";
import { SourceLoadError } from "../types.ts";

type GitHubGistApiFile = {
  filename?: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
};

type GitHubGistApiResponse = {
  description?: string | null;
  html_url?: string;
  files?: Record<string, GitHubGistApiFile>;
};

function isNonEmptySegment(segment: string | undefined): segment is string {
  return segment !== undefined && segment.length > 0;
}

function gistPageUrl(gistId: string): string {
  return `https://gist.github.com/${gistId}`;
}

function mapDescription(trimmedDescription: string | undefined) {
  return trimmedDescription === undefined || trimmedDescription.length === 0
    ? {}
    : { description: trimmedDescription };
}

async function loadGistFile(
  file: GitHubGistApiFile,
  options?: SourceLoadOptions,
): Promise<SourceFile> {
  const filename = file.filename ?? "Untitled";
  const fetcher = options?.fetcher ?? directSourceFetcher;

  if (file.truncated === true) {
    try {
      if (!isNonEmptySegment(file.raw_url)) {
        throw new Error("Missing raw URL.");
      }

      const content = await fetcher<string>(file.raw_url, {
        signal: options?.signal,
      });

      return {
        status: "ready",
        id: filename,
        name: filename,
        content,
      };
    } catch {
      return {
        status: "error",
        id: filename,
        name: filename,
        error: {
          message: "Failed to load full content for this truncated gist file.",
        },
      };
    }
  }

  return {
    status: "ready",
    id: filename,
    name: filename,
    content: file.content ?? "",
  };
}

export const githubGistService: SourceService<GitHubGistReference> = {
  type: "github-gist",

  async load(reference: GitHubGistReference, options?: SourceLoadOptions): Promise<LoadedSource> {
    let response: GitHubGistApiResponse;
    const fetcher = options?.fetcher ?? directSourceFetcher;

    try {
      response = await fetcher<GitHubGistApiResponse>(
        `https://api.github.com/gists/${reference.gistId}`,
        { signal: options?.signal },
      );
    } catch {
      throw new SourceLoadError("Failed to load GitHub Gist.");
    }

    const apiFiles = Object.values(response.files ?? {});
    if (apiFiles.length === 0) {
      throw new SourceLoadError("No files found in this gist.");
    }

    const files = await Promise.all(apiFiles.map((file) => loadGistFile(file, options)));

    const trimmedDescription = response.description?.trim();
    return {
      reference,
      metadata: {
        title: trimmedDescription || reference.gistId,
        ...mapDescription(trimmedDescription),
        url: response.html_url ?? gistPageUrl(reference.gistId),
      },
      files,
    };
  },
};
