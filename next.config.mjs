/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
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
