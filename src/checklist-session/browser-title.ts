const titleSuffix = " - Checkgist";
const maxSourceTitleLength = 60;

export function formatBrowserTitle(sourceTitle: string): string {
  const trimmedTitle = sourceTitle.trim();
  if (trimmedTitle.length === 0) {
    return "Checkgist";
  }

  const title =
    trimmedTitle.length > maxSourceTitleLength
      ? `${trimmedTitle.slice(0, maxSourceTitleLength - 3)}...`
      : trimmedTitle;

  return `${title}${titleSuffix}`;
}
