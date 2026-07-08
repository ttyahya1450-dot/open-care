/** @type {import('next').NextConfig} */

// Docker standalone mode: set NEXT_OUTPUT=standalone in the Dockerfile build stage.
// Vercel omits this env so it uses its own serverless bundler (no standalone needed).
const outputConfig =
  process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {};

const nextConfig = {
  ...outputConfig,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-XSS-Protection',         value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          // Geolocation permission is required for GPS clock-in; camera/mic denied.
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

// Build-time warning for missing production secrets.
// Does NOT throw — local dev builds succeed without secrets configured.
// At runtime, API routes throw StripeConfigError / HTTP 503 for callers.
if (process.env.NODE_ENV === 'production') {
  const REQUIRED = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const missing  = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn(
      '\n⚠  [OpenCare] Missing production environment variables:\n' +
      missing.map((k) => `   • ${k}`).join('\n') +
      '\n   Stripe API routes will return 503 until these are set.' +
      '\n   Set them in Vercel Dashboard > Settings > Environment Variables' +
      '\n   or pass them via Docker --env-file.\n',
    );
  }
}

module.exports = nextConfig;
