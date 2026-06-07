import type {
  PastebinReference,
  SourceContent,
  SourceService,
} from "./types";

const PASTEBIN_HOST = "pastebin.com";

function isNonEmptySegment(segment: string | undefined): segment is string {
  return segment !== undefined && segment.length > 0;
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
    if (
      host !== PASTEBIN_HOST ||
      extra !== undefined ||
      !isNonEmptySegment(pasteId)
    ) {
      return null;
    }

    return { type: "pastebin", pasteId };
  },

  toRoute(reference: PastebinReference): string[] {
    return [PASTEBIN_HOST, reference.pasteId];
  },

  load(): Promise<SourceContent> {
    throw new Error("Pastebin loading is not implemented in this slice.");
  },
};
