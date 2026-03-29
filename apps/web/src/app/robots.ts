import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/security", "/privacy-policy", "/terms-of-service"],
        disallow: "/",
      },
    ],
  };
}
