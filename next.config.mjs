// Cloudinary delivery URLs are https://res.cloudinary.com/<cloud>/image/upload/…
// so the leading path segment is the account, and scoping the pattern to ours is
// what stops the optimizer fetching anyone else's. Fail-fast rather than
// defaulting, the same call src/config/cloudinary.ts makes for the upload
// credentials — the message below has to carry the reasoning, because whoever
// reads it is looking at a dead build and one edit away from the wrong fix.
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;

if (!cloudinaryCloudName) {
  throw new Error(
    'CLOUDINARY_CLOUD_NAME environment variable is not set.\n' +
      '  Set it in .env locally, and in the Vercel project environment to deploy.\n' +
      '  It scopes next/image to this one Cloudinary account. Do not widen the\n' +
      '  pattern back to "/**" to get past this — that would let anyone hand\n' +
      "  another account's asset to /_next/image and have this site fetch,\n" +
      '  resize and serve it.',
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: `/${cloudinaryCloudName}/**`,
      },
    ],
  },
  // Baseline security headers applied to every response. CSP is intentionally
  // deferred — meaningful scoping needs a pass over inline scripts, Stripe.js,
  // and Cloudinary image hosts; that's its own feature.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
