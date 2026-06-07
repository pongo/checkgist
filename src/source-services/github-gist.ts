import { ofetch } from "ofetch";

import type { GitHubGistReference, SourceFile, SourceContent, SourceService } from "./types";
import { SourceLoadError } from "./types";

const GIST_HOST = "gist.github.com";

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

function mapDescription(description: string | null | undefined) {
  const trimmedDescription = description?.trim();
  return trimmedDescription === undefined || trimmedDescription.length === 0
    ? {}
    : { description: trimmedDescription };
}

async function loadGistFile(
  file: GitHubGistApiFile,
  options?: { signal?: AbortSignal },
): Promise<SourceFile> {
  const filename = file.filename ?? "Untitled";

  if (file.truncated === true) {
    try {
      if (!isNonEmptySegment(file.raw_url)) {
        throw new Error("Missing raw URL.");
      }

      const content = await ofetch<string>(file.raw_url, {
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

  fromUrl(url: URL): GitHubGistReference | null {
    if (url.hostname.toLowerCase() !== GIST_HOST) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1 && segments.length !== 2) {
      return null;
    }

    const gistId = segments[segments.length - 1];
    if (!isNonEmptySegment(gistId)) {
      return null;
    }

    return { type: "github-gist", gistId };
  },

  fromRoute(path: string[]): GitHubGistReference | null {
    const [host, gistId, extra] = path;
    if (host !== GIST_HOST || extra !== undefined || !isNonEmptySegment(gistId)) {
      return null;
    }

    return { type: "github-gist", gistId };
  },

  toRoute(reference: GitHubGistReference): string[] {
    return [GIST_HOST, reference.gistId];
  },

  async load(
    reference: GitHubGistReference,
    options?: { signal?: AbortSignal },
  ): Promise<SourceContent> {
    let response: GitHubGistApiResponse;

    try {
      response = await ofetch<GitHubGistApiResponse>(
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

    return {
      reference,
      metadata: {
        title: reference.gistId,
        ...mapDescription(response.description),
        url: response.html_url ?? gistPageUrl(reference.gistId),
      },
      files,
    };
  },
};
