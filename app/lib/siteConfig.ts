export const siteConfig = {
  siteName: "GRAIL",
  companyName: "GRAIL Collectibles LLC",
  productionUrl: "https://www.grailcollects.com",
  canonicalUrl: "https://www.grailcollects.com",
  websiteUrl: "https://www.grailcollects.com",
  defaultOgImage: "/opengraph-image",
  supportEmail: "support@grailcollectibles.com",
};

export function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function getConfiguredSiteUrl() {
  if (process.env.NODE_ENV === "production") {
    return siteConfig.productionUrl;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return "http://localhost:3000";
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.productionUrl}${normalizedPath}`;
}
