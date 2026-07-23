/** A Markdown document owned and persisted by Checkgist. */
export type LocalDocument = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

/** Maximum number of characters allowed in a persisted Local Document title. */
export const localDocumentTitleMaxLength = 200;

/**
 * Returns the canonical persisted title or a user-facing validation message.
 * Content intentionally is not normalized: Markdown must round-trip exactly.
 */
export function validateLocalDocumentTitle(
  title: string,
): { valid: true; title: string } | { valid: false; message: string } {
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) {
    return { valid: false, message: "A title is required." };
  }
  if (trimmedTitle.length > localDocumentTitleMaxLength) {
    return {
      valid: false,
      message: `Title must be ${localDocumentTitleMaxLength} characters or fewer.`,
    };
  }
  return { valid: true, title: trimmedTitle };
}

/** Returns whether a route parameter is an RFC 4122 UUID. */
export function isLocalDocumentId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
