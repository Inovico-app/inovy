import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/api/",
          "/_next/",
          "/settings/",
          "/admin/",
          "/projects/",
          "/recordings/",
          "/tasks/",
          "/teams/",
          "/meetings/",
          "/chat/",
          "/record/",
        ],
        allow: [
          "/sign-in",
          "/sign-up",
          "/onboarding",
          "/accept-invitation",
          "/security",
          "/privacy-policy",
          "/terms-of-service",
        ],
      },
    ],
  };
}
