import { describe, expect, it } from 'vitest';

import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_COUNT,
  validateProductImages,
} from './image-validate';

// Magic-number prefixes for the three formats the validator accepts.
const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEADER = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const WEBP_HEADER = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
// What a crafted SVG-XSS payload starts with — bytes 0x3c (`<`).
const SVG_AS_JPEG = Uint8Array.from([0x3c, 0x73, 0x76, 0x67, 0x20, 0x78]);

const makeFile = (bytes: Uint8Array, type: string, name = 'cut.jpg'): File =>
  new File([new Uint8Array(bytes)], name, { type });

describe('validateProductImages', () => {
  it('accepts a real JPEG declared as image/jpeg', async () => {
    const file = makeFile(JPEG_HEADER, 'image/jpeg');
    const result = await validateProductImages([file]);
    expect(result.ok).toBe(true);
  });

  it('accepts a real PNG declared as image/png', async () => {
    const file = makeFile(PNG_HEADER, 'image/png', 'cut.png');
    const result = await validateProductImages([file]);
    expect(result.ok).toBe(true);
  });

  it('accepts a real WebP declared as image/webp', async () => {
    const file = makeFile(WEBP_HEADER, 'image/webp', 'cut.webp');
    const result = await validateProductImages([file]);
    expect(result.ok).toBe(true);
  });

  it('rejects SVG bytes lying about their MIME', async () => {
    const file = makeFile(SVG_AS_JPEG, 'image/jpeg', 'cut.jpg');
    const result = await validateProductImages([file]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/does not look like a real/);
    }
  });

  it('rejects a JPEG mislabelled as PNG', async () => {
    const file = makeFile(JPEG_HEADER, 'image/png', 'cut.png');
    const result = await validateProductImages([file]);
    expect(result.ok).toBe(false);
  });

  it('rejects unsupported MIME types before the magic-number sniff', async () => {
    const file = makeFile(JPEG_HEADER, 'image/gif', 'cut.gif');
    const result = await validateProductImages([file]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Unsupported image type/);
    }
  });

  it('rejects too many files', async () => {
    const files = Array.from({ length: PRODUCT_IMAGE_MAX_COUNT + 1 }, () =>
      makeFile(JPEG_HEADER, 'image/jpeg'),
    );
    const result = await validateProductImages(files);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Too many images/);
    }
  });

  it('rejects oversized files', async () => {
    const big = new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1);
    big.set(JPEG_HEADER);
    const file = makeFile(big, 'image/jpeg', 'big.jpg');
    const result = await validateProductImages([file]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/exceeds the/);
    }
  });

  it('accepts an empty file list', async () => {
    const result = await validateProductImages([]);
    expect(result.ok).toBe(true);
  });
});
