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
 * Absolute link for messages sent outside the app (WhatsApp, email).
 * Full http(s) URLs pass through; upload paths are resolved against baseUrl.
 * Returns null when a relative path cannot be resolved (no base URL).
 */
export function toAbsoluteImageUrl(
  path: string | null | undefined,
  baseUrl: string | null | undefined,
): string | null {
  const trimmed = typeof path === "string" ? path.trim() : "";
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const relative = toImageUrl(trimmed);
  const base = baseUrl?.trim().replace(/\/+$/, "");
  if (!relative || !base) return null;
  return `${base}${relative}`;
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
