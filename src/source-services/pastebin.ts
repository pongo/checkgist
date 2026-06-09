import { corsProxySourceFetcher } from "./fetcher";
import type { PastebinReference, LoadedSource, SourceLoadOptions, SourceService } from "./types";
import { SourceLoadError } from "./types";

const PASTEBIN_HOST = "pastebin.com";

function isNonEmptySegment(segment: string | undefined): segment is string {
  return segment !== undefined && segment.length > 0;
}

function pastebinPageUrl(pasteId: string): string {
  return `https://pastebin.com/${pasteId}`;
}

function pastebinRawUrl(pasteId: string): string {
  return `https://pastebin.com/raw/${pasteId}`;
}

export const pastebinService: SourceService<PastebinReference> = {
  type: "pastebin",

  fromUrl(url: URL): PastebinReference | null {
    if (url.hostname.toLowerCase() !== PASTEBIN_HOST) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const pasteId =
      segments.length === 1 && segments[0] !== "raw"
        ? segments[0]
        : segments.length === 2 && segments[0] === "raw"
          ? segments[1]
          : undefined;

    if (!isNonEmptySegment(pasteId)) {
      return null;
    }

    return { type: "pastebin", pasteId };
  },

  fromRoute(path: string[]): PastebinReference | null {
    const [host, pasteId, extra] = path;
    if (host !== PASTEBIN_HOST || extra !== undefined || !isNonEmptySegment(pasteId)) {
      return null;
    }

    return { type: "pastebin", pasteId };
  },

  toRoute(reference: PastebinReference): string[] {
    return [PASTEBIN_HOST, reference.pasteId];
  },

  async load(reference: PastebinReference, options?: SourceLoadOptions): Promise<LoadedSource> {
    let content: string;
    const fetcher = options?.fetcher ?? corsProxySourceFetcher;

    try {
      content = await fetcher<string>(pastebinRawUrl(reference.pasteId), {
        signal: options?.signal,
      });
    } catch {
      throw new SourceLoadError("Failed to load Pastebin source.");
    }

    return {
      reference,
      metadata: {
        title: reference.pasteId,
        url: pastebinPageUrl(reference.pasteId),
      },
      files: [
        {
          status: "ready",
          id: reference.pasteId,
          name: reference.pasteId,
          content,
        },
      ],
    };
  },
};
