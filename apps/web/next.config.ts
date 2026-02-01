import { withWorkflow } from "workflow/next";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  reactCompiler: true,
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
  },
  // Security headers to prevent directory listing and enhance security
  // Implements SSD-29.1.02: Disable directory listing on web server
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
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

export default withWorkflow(nextConfig);

