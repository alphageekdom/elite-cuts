import 'server-only';

import cloudinary from '@/config/cloudinary';

// Extracts the public_id from a Cloudinary secure_url so it can be passed to
// `uploader.destroy`. Returns null for non-Cloudinary URLs (seeded local
// filenames, anything else) so the caller can safely walk a mixed list.
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url.startsWith('https://res.cloudinary.com/')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/);
  return match?.[1] ?? null;
}

// Fires destroy calls for every Cloudinary URL in `urls` in parallel. Local
// seeded filenames are skipped. Individual failures are logged but never
// thrown — a Cloudinary outage must not block the caller's Mongo delete.
export async function deleteCloudinaryImages(urls: string[]): Promise<void> {
  const publicIds = urls
    .map(extractCloudinaryPublicId)
    .filter((id): id is string => id !== null);
  if (publicIds.length === 0) return;

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('[cloudinary destroy] failed', { publicId, err });
      }
    }),
  );
}
