import { withWorkflow } from "workflow/next";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer }) => {
    // Exclude ws and workflow packages from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false,
        url: false,
        buffer: false,
      };
    }

    // Mark ws as external for server build
    if (isServer) {
      config.externals = [...(config.externals ?? []), "ws"];
    }

    return config;
  },
};

export default withWorkflow(nextConfig);

