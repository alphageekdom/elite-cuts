import 'server-only';

import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Fail at startup with a clear message instead of letting the SDK upload throw a vague auth error at first call.
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error(
    'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables are not set',
  );
}

type CloudinaryCache = { configured: boolean };

// Cache on globalThis so the configured flag survives Next.js dev hot reload — module-scoped state would re-run config() per save.
declare global {
  var cloudinaryCache: CloudinaryCache | undefined;
}

const cached: CloudinaryCache = globalThis.cloudinaryCache ?? { configured: false };
globalThis.cloudinaryCache = cached;

// No promise cache here (cf. database.ts) — cloudinary.config() is synchronous, so there is no in-flight init to coalesce.
if (!cached.configured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  cached.configured = true;
}

export default cloudinary;
