import { withWorkflow } from "workflow/next";

import type { NextConfig } from "next";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
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

