import type {
  GitHubGistReference,
  SourceContent,
  SourceService,
} from "./types";

const GIST_HOST = "gist.github.com";

function isNonEmptySegment(segment: string | undefined): segment is string {
  return segment !== undefined && segment.length > 0;
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

  load(): Promise<SourceContent> {
    throw new Error("GitHub Gist loading is not implemented in this slice.");
  },
};
