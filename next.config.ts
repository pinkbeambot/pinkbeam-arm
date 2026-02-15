import type { NextConfig } from "next";
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

// SECURITY: Block production deployments with DEV_AUTH_BYPASS enabled
// This check runs during Vercel/production builds to prevent auth bypass from leaking
const isVercelProd = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_TARGET_ENV === 'production';
if (isVercelProd && process.env.DEV_AUTH_BYPASS === 'true') {
  throw new Error(
    'SECURITY VIOLATION: DEV_AUTH_BYPASS cannot be enabled in production. ' +
    'Remove DEV_AUTH_BYPASS from your environment variables to build.'
  );
}

const nextConfig: NextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Dist directory for builds
  distDir: '.next',
  
  // Transpile swagger-ui-react for Next.js compatibility
  transpilePackages: ['swagger-ui-react', 'next-swagger-doc'],
  
  // Environment variables available at build time
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
