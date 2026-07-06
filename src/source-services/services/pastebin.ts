import { corsProxySourceFetcher } from "../fetcher.ts";
import type {
  PastebinReference,
  LoadedSource,
  SourceLoadOptions,
  SourceService,
  SourceReference,
} from "../types.ts";
import { SourceLoadError } from "../types.ts";
import type { SourceAddressRule } from "../addressing.ts";

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

function getPasteId(segments: string[]) {
  if (segments.length === 1 && segments[0] !== "raw") return segments[0];
  if (segments.length === 2 && segments[0] === "raw") return segments[1];
  return undefined;
}

export const pastebinAddressRule: SourceAddressRule = {
  type: "pastebin",
  name: "pastebin-source",
  path: "/pastebin.com/:pasteId",

  fromUrl(url: URL): PastebinReference | null {
    if (url.hostname.toLowerCase() !== PASTEBIN_HOST) {
      return null;
    }

    const pasteId = getPasteId(url.pathname.split("/").filter(Boolean));
    return isNonEmptySegment(pasteId) ? { type: "pastebin", pasteId } : null;
  },

  fromRoute(path: string[]): PastebinReference | null {
    const [host, pasteId, extra] = path;
    if (host !== PASTEBIN_HOST || extra !== undefined || !isNonEmptySegment(pasteId)) {
      return null;
    }

    return { type: "pastebin", pasteId };
  },

  toRouteSegments(reference: SourceReference): string[] | null {
    return reference.type === "pastebin" ? [PASTEBIN_HOST, reference.pasteId] : null;
  },
};

export const pastebinService: SourceService<PastebinReference> = {
  type: "pastebin",

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
