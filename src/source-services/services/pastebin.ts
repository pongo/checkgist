import { corsProxySourceFetcher } from "../fetcher.ts";
import type {
  PastebinReference,
  LoadedSource,
  SourceLoadOptions,
  SourceService,
} from "../types.ts";
import { SourceLoadError } from "../types.ts";

function pastebinPageUrl(pasteId: string): string {
  return `https://pastebin.com/${pasteId}`;
}

function pastebinRawUrl(pasteId: string): string {
  return `https://pastebin.com/raw/${pasteId}`;
}

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
