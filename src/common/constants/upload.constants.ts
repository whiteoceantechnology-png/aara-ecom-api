/**
 * Centralized upload configuration.
 * Used by admin-images controller, service, and multer exception filter.
 */
export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_FILES_PER_REQUEST: 20,
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ] as const,
} as const;

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
