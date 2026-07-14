import type { MetadataRoute } from "next";
import { siteConfig } from "./lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/checkout",
        "/messages",
        "/orders",
        "/wallet",
        "/login",
        "/signup",
      ],
    },
    sitemap: `${siteConfig.productionUrl}/sitemap.xml`,
  };
}
