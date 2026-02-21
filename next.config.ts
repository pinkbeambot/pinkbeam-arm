import type { NextConfig } from "next";
import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
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

// Build CSP directives based on environment
const isDev = process.env.NODE_ENV === 'development';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
const supabaseWss = supabaseUrl.replace('https://', 'wss://');

const cspDirectives = [
  // Only allow resources from own origin by default
  `default-src 'self'`,
  // Scripts: self + inline (Next.js requires it) + eval in dev for HMR
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Styles: self + inline (Tailwind/Next.js injects inline styles)
  `style-src 'self' 'unsafe-inline'`,
  // Images: self + data URIs (for avatars, inline images) + Supabase storage + blob
  `img-src 'self' data: blob: ${supabaseUrl}`,
  // Fonts: self + data URIs
  `font-src 'self' data:`,
  // Connect: self + Supabase REST/Auth (HTTPS) + Supabase Realtime (WSS)
  `connect-src 'self' ${supabaseUrl} ${supabaseWss}${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
  // Media: self
  `media-src 'self'`,
  // Objects: none (no Flash/plugins)
  `object-src 'none'`,
  // Frames: none (we set X-Frame-Options: DENY too)
  `frame-src 'none'`,
  // Frame ancestors: none (prevent embedding)
  `frame-ancestors 'none'`,
  // Base URI: self only (prevent base tag hijacking)
  `base-uri 'self'`,
  // Form actions: self only
  `form-action 'self'`,
  // Upgrade insecure requests in production
  ...(!isDev ? ['upgrade-insecure-requests'] : []),
];

const contentSecurityPolicy = cspDirectives.join('; ');

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

  // Image optimization configuration
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Turbopack configuration
  turbopack: {
    // Module resolution
    resolveAlias: {
      'date-fns': 'date-fns/esm',
    },
    // Root directories
    root: process.cwd(),
  },

  // Experimental features for performance
  experimental: {
    // Optimize package imports for tree shaking
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-icons',
    ],
    // Enable server actions (already default in Next.js 15)
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Webpack configuration for bundle optimization (fallback for non-turbopack)
  webpack: (config, { isServer }) => {
    // Tree shaking for heavy libraries
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Use lighter date-fns entry point
        'date-fns': 'date-fns/esm',
      };

      // Split chunks optimization
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Recharts is heavy - separate chunk
            recharts: {
              test: /[\\/]node_modules[\\/](recharts|victory-vendor|d3-)[\\/]/,
              name: 'recharts',
              chunks: 'all',
              priority: 20,
            },
            // Framer Motion - separate chunk
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 20,
            },
            // UI components - separate chunk
            ui: {
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 5,
            },
          },
        },
      };
    }

    return config;
  },

  // API versioning: route /api/v1/* to physical /api/* route files
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/v1/:path*', destination: '/api/:path*' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy — controls which resources the browser may load
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          // Prevent clickjacking by disallowing framing
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME-type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information sent with requests
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Enforce HTTPS for 1 year, include subdomains, allow HSTS preload
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Restrict browser features/APIs the app doesn't need
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Legacy XSS protection header (still useful for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Prevent DNS prefetching to third-party origins
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Powered by header
  poweredByHeader: false,
};

module.exports = withBundleAnalyzer(nextConfig);
