import path from "path";

import { withWorkflow } from "workflow/next";

import type { NextConfig } from "next";

const isDockerBuild = process.env.DOCKER_BUILD === "true";

const nextConfig: NextConfig = {
  ...(isDockerBuild && {
    output: "standalone",
    outputFileTracingRoot: path.join(__dirname, "../../"),
  }),
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
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(self), camera=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.neon.tech https://*.qdrant.io https://*.openai.com https://*.deepgram.com wss://*.deepgram.com https://*.anthropic.com https://*.azure.com https://*.stripe.com https://*.resend.com https://*.recall.ai",
              "media-src 'self' blob: https://*.blob.core.windows.net",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
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

