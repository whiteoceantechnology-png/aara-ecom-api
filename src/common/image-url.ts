/**
 * Build image URL for frontend consumption.
 * - Upload API paths (e.g. "2026/03/20/xxx.jpeg") → serve URL
 * - Legacy paths starting with / → returned as-is
 */
export function toImageUrl(path: string | null | undefined): string | null {
  const trimmed = typeof path === "string" ? path.trim() : "";
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  return `/admin/images/serve?path=${encodeURIComponent(trimmed)}`;
}

/**
 * @deprecated Use toImageUrl instead. Kept for backwards compatibility.
 * @see toImageUrl
 */
export const toCategoryImageUrl = toImageUrl;

/**
 * Transform array of image paths to serve URLs.
 * Filters out null/undefined/empty paths.
 */
export function toImageUrls(paths: string[]): string[] {
  return paths
    .map((p) => toImageUrl(p))
    .filter((url): url is string => url != null && url !== "");
}
