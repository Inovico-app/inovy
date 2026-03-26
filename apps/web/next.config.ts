import path from "path";

import { withWorkflow } from "workflow/next";
import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDockerBuild = process.env.DOCKER_BUILD === "true";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net",
      },
    ],
  },
  ...(isDockerBuild && {
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname, "../../"),
  }),
  // SSD-24.1.05: Suppress X-Powered-By header to prevent server info leakage
  poweredByHeader: false,
  typedRoutes: true,
  cacheComponents: true,
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Exclude pino and related packages from bundling (server-only)
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "pino-file",
    "pino-worker",
    "thread-system",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    proxyClientMaxBodySize: "500mb",
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      {
        source: "/settings/profile/edit",
        destination: "/settings/profile",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // SSD-33: Disable legacy XSS filter (modern CSP is the replacement)
          { key: "X-XSS-Protection", value: "0" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // SSD-33: Cross-Origin isolation headers
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(), microphone=(self), camera=(self), display-capture=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.neon.tech https://*.qdrant.io https://*.openai.com https://*.deepgram.com wss://*.deepgram.com https://*.anthropic.com https://*.azure.com https://*.blob.core.windows.net https://*.stripe.com https://*.resend.com https://*.recall.ai https://va.vercel-scripts.com",
              "media-src 'self' blob: https://*.blob.core.windows.net",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      // SSD-33/SSD-4: Prevent caching of authentication-related pages
      {
        source:
          "/(sign-in|sign-up|forgot-password|reset-password|verify-email|onboarding)(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      // SSD-33: Prevent caching of API responses containing sensitive data
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Exclude pino and related Node.js-only packages from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        util: false,
        stream: false,
        events: false,
        worker_threads: false,
        module: false,
        url: false,
        assert: false,
      };
      // Explicitly exclude pino from client bundle
      config.externals = config.externals ?? [];
      if (typeof config.externals === "function") {
        const originalExternals = config.externals;
        config.externals = [
          originalExternals,
          ({ request }: { request?: string }) => {
            if (request === "pino" || request === "pino-pretty") {
              return true;
            }
          },
        ];
      } else if (Array.isArray(config.externals)) {
        config.externals.push(({ request }: { request?: string }) => {
          if (request === "pino" || request === "pino-pretty") {
            return true;
          }
        });
      }
    }
    return config;
  },
};

export default withNextIntl(withWorkflow(nextConfig));
