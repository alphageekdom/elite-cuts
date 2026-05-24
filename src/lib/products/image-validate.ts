// Image upload validation for the admin product form. Cloudinary trusts
// what the server hands it, so this is the only gate between an admin
// upload and EliteCuts's image domain — we reject SVG (script-bearing),
// oversized blobs, and unexpected MIME types up front.
//
// The browser-supplied `file.type` is whatever the client chose to claim, so
// a tampered fetch (or an admin curl) can label SVG bytes as `image/jpeg` and
// slip the MIME check. We sniff the first bytes of every upload against the
// canonical magic numbers for JPEG, PNG, and WebP and reject anything that
// doesn't match what its declared type says it is.

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

type AllowedType = (typeof PRODUCT_IMAGE_ALLOWED_TYPES)[number];

// JPEG SOI = FF D8 FF; PNG = 89 50 4E 47 0D 0A 1A 0A; WebP = "RIFF....WEBP".
const detectFormat = (bytes: Uint8Array): AllowedType | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp';
  }
  return null;
};

export async function validateProductImages(
  files: File[],
): Promise<ImageValidateResult> {
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
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const detected = detectFormat(head);
    if (!detected || detected !== file.type) {
      return {
        ok: false,
        error: `Image "${file.name}" does not look like a real JPEG, PNG, or WebP`,
      };
    }
  }
  return { ok: true, files };
}
