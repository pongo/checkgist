import { getLocalDocument, isLocalDocumentId, localDocumentEditRoute } from "@/local-documents";

import type { SourceAddressRule } from "../addressing.ts";
import {
  SourceLoadError,
  type LoadedSource,
  type LocalDocumentReference,
  type SourceService,
} from "../types.ts";

const localDocumentsSegment = "local";

function normalizedBasePath(): string {
  const base = import.meta.env.BASE_URL;
  // The root base path and an empty base path both map to URL.pathname below.
  // Stryker disable next-line StringLiteral: replacing the root marker with an empty string preserves the resulting app path for browser URL pathnames
  return base === "/" ? "/" : `/${base.replace(/^\/|\/$/g, "")}/`;
}

function appPathFromUrl(url: URL): string | null {
  if (url.origin !== window.location.origin) {
    return null;
  }

  const basePath = normalizedBasePath();
  // URL.pathname always starts with a slash, so the root branch is equivalent
  // to the generic prefix-and-slice branch for the root base path.
  // Stryker disable next-line ConditionalExpression, StringLiteral, BlockStatement: both branches return the same pathname when the base path is root
  if (basePath === "/") {
    return url.pathname;
  }
  if (!url.pathname.startsWith(basePath)) {
    return null;
  }
  return `/${url.pathname.slice(basePath.length)}`;
}

function referenceFromLocalSegments(path: string[]): LocalDocumentReference | null {
  const [prefix, documentId, extra] = path;
  if (
    prefix !== localDocumentsSegment ||
    extra !== undefined ||
    // Stryker disable next-line StringLiteral: the fallback is only used for absent IDs, and any non-UUID sentinel remains invalid
    !isLocalDocumentId(documentId ?? "")
  ) {
    return null;
  }
  return { type: "local-document", documentId: documentId as string };
}

/** Source-addressing rule for the Local Document checklist view route. */
export const localDocumentAddressRule: SourceAddressRule = {
  type: "local-document",
  name: "local-document-source",
  path: "/local/:documentId",

  fromUrl(url) {
    const appPath = appPathFromUrl(url);
    if (appPath === null) return null;

    const segments = appPath.split("/").filter(Boolean);
    if (segments.length === 3 && segments[2] === "edit") {
      return referenceFromLocalSegments(segments.slice(0, 2));
    }
    return referenceFromLocalSegments(segments);
  },

  fromRoute(path) {
    return referenceFromLocalSegments(path);
  },

  toRouteSegments(reference) {
    return reference.type === "local-document"
      ? [localDocumentsSegment, reference.documentId]
      : null;
  },
};

/** Adapts a persisted Local Document into the standard Loaded Source pipeline. */
export const localDocumentService: SourceService<LocalDocumentReference> = {
  type: "local-document",

  async load(reference, options): Promise<LoadedSource> {
    options?.signal?.throwIfAborted();
    const document = await getLocalDocument(reference.documentId);
    options?.signal?.throwIfAborted();

    if (document === null) {
      throw new SourceLoadError("Local document not found.");
    }

    return {
      reference,
      metadata: {
        title: document.title,
        url: localDocumentEditRoute(document.id),
      },
      files: [
        {
          status: "ready",
          id: document.id,
          name: document.title,
          content: document.content,
        },
      ],
    };
  },
};
