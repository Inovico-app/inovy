import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	// Cache Components: Enables explicit caching with "use cache" directive
	// Dynamic by default, opt-in to static caching for performance
	cacheComponents: true,
};

export default nextConfig;
