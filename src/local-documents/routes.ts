const localDocumentsSegment = "local";

/** Returns the canonical checklist view route for a Local Document. */
export function localDocumentViewRoute(documentId: string): string {
  return `/${localDocumentsSegment}/${encodeURIComponent(documentId)}`;
}

/** Returns the canonical editor route for a Local Document. */
export function localDocumentEditRoute(documentId: string): string {
  return `${localDocumentViewRoute(documentId)}/edit`;
}
