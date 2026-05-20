// Image upload validation for the admin product form. Cloudinary trusts
// what the server hands it, so this is the only gate between an admin
// upload and EliteCuts's image domain — we reject SVG (script-bearing),
// oversized blobs, and unexpected MIME types up front.

export const PRODUCT_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_COUNT = 8;

export type ImageValidateResult =
  | { ok: true; files: File[] }
  | { ok: false; error: string };

export function validateProductImages(files: File[]): ImageValidateResult {
  if (files.length > PRODUCT_IMAGE_MAX_COUNT) {
    return {
      ok: false,
      error: `Too many images — limit ${PRODUCT_IMAGE_MAX_COUNT} per product`,
    };
  }
  for (const file of files) {
    if (!(PRODUCT_IMAGE_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      return {
        ok: false,
        error: `Unsupported image type "${file.type || 'unknown'}" — use JPEG, PNG, or WebP`,
      };
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      return {
        ok: false,
        error: `Image "${file.name}" exceeds the ${PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024} MB limit`,
      };
    }
  }
  return { ok: true, files };
}
