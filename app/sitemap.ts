import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";
import { getPublicCollectorSlug } from "./lib/publicCollectorLinks";
import { siteConfig } from "./lib/siteConfig";

type SitemapListingRow = {
  id: string;
  status: string | null;
  sale_format: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type SitemapProfileRow = {
  id: string;
  username: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function getSupabaseForSitemap() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
}

function route(path: string, options: Partial<MetadataRoute.Sitemap[number]> = {}) {
  return {
    url: `${siteConfig.productionUrl}${path}`,
    lastModified: new Date(),
    ...options,
  };
}

function publicCollectionSlug(profile: SitemapProfileRow) {
  return getPublicCollectorSlug(profile, profile.id);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    route("/", { priority: 1, changeFrequency: "daily" }),
    route("/browse", { priority: 0.9, changeFrequency: "hourly" }),
    route("/collections", { priority: 0.75, changeFrequency: "daily" }),
    route("/buyer-protection", { priority: 0.55, changeFrequency: "monthly" }),
    route("/seller-rules", { priority: 0.55, changeFrequency: "monthly" }),
    route("/fees", { priority: 0.5, changeFrequency: "monthly" }),
    route("/shipping-policy", { priority: 0.45, changeFrequency: "monthly" }),
    route("/refund-dispute-policy", { priority: 0.45, changeFrequency: "monthly" }),
    route("/prohibited-items", { priority: 0.4, changeFrequency: "monthly" }),
    route("/privacy", { priority: 0.35, changeFrequency: "yearly" }),
    route("/terms", { priority: 0.35, changeFrequency: "yearly" }),
    route("/contact-support", { priority: 0.35, changeFrequency: "monthly" }),
  ];

  const supabase = getSupabaseForSitemap();

  if (!supabase) {
    return staticRoutes;
  }

  try {
    const [{ data: listingData }, { data: profileData }] = await Promise.all([
      supabase
        .from("listings")
        .select("id, status, sale_format, created_at")
        .in("status", ["active", "collection"])
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("profiles")
        .select("id, username, created_at")
        .limit(1000),
    ]);

    const listings = ((listingData || []) as SitemapListingRow[]).map((listing) =>
      route(`/cards/${listing.id}`, {
        lastModified: listing.updated_at || listing.created_at || new Date(),
        priority: listing.sale_format === "auction" ? 0.82 : 0.8,
        changeFrequency: listing.sale_format === "auction" ? "hourly" : "daily",
      }),
    );

    const profiles = ((profileData || []) as SitemapProfileRow[]).map((profile) =>
      route(`/collections/${publicCollectionSlug(profile)}`, {
        lastModified: profile.updated_at || profile.created_at || new Date(),
        priority: 0.62,
        changeFrequency: "weekly",
      }),
    );

    return [...staticRoutes, ...listings, ...profiles];
  } catch (error) {
    console.warn("Sitemap dynamic route fetch skipped:", error);
    return staticRoutes;
  }
}
