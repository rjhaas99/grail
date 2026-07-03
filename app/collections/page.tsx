"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { supabase } from "../../lib/supabase";
import { buildMockSellerListings, mockSellers } from "../lib/mockData";
import type { MockSeller } from "../lib/mockData";

type CollectionSeller = MockSeller & {
  searchText?: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type ListingRow = {
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  price: number | null;
  status: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
};

const filters = ["All", "Grail Collections", "Sports", "TCG", "Top Sellers", "New Collections"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GC";
}

function getProfileSlug(profile: ProfileRow) {
  const username = profile.username?.replace(/^@/, "").trim();
  return username ? encodeURIComponent(username) : profile.id;
}

export default function CollectionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [followed, setFollowed] = useState<string[]>([]);
  const [realSellers, setRealSellers] = useState<CollectionSeller[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadRealCollections() {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .limit(50);

        if (profileError) {
          throw profileError;
        }

        const profiles = (profileData || []) as ProfileRow[];
        const profileIds = profiles.map((profile) => profile.id);
        let listings: ListingRow[] = [];

        if (profileIds.length > 0) {
          const { data: listingData, error: listingError } = await supabase
            .from("listings")
            .select("seller_id, title, sport, price, status, is_collection_card, is_public_collection")
            .in("seller_id", profileIds)
            .or("status.eq.active,status.eq.collection,is_public_collection.eq.true");

          if (listingError) {
            console.error("Collections listing fetch error:", listingError);
          } else {
            listings = (listingData || []) as ListingRow[];
          }
        }

        const listingsBySeller = new Map<string, ListingRow[]>();
        listings
          .filter((listing) => {
            const status = listing.status?.toLowerCase();
            return (
              status === "active" ||
              status === "collection" ||
              (Boolean(listing.is_public_collection) &&
                status !== "inactive" &&
                status !== "deleted" &&
                status !== "sold")
            );
          })
          .forEach((listing) => {
          if (!listing.seller_id) {
            return;
          }
          listingsBySeller.set(listing.seller_id, [
            ...(listingsBySeller.get(listing.seller_id) || []),
            listing,
          ]);
        });

        const mappedSellers = profiles.map((profile) => {
          const sellerListings = listingsBySeller.get(profile.id) || [];
          const name = profile.full_name || profile.username || "GRAIL Seller";
          const slug = getProfileSlug(profile);
          const totalValue = sellerListings.reduce(
            (sum, listing) => sum + Number(listing.price || 0),
            0,
          );

          return {
            slug,
            name,
            initials: getInitials(name),
            level: "GRAIL Seller",
            rewardsBadge: "Public Collection",
            completedSales: 0,
            activeListings: sellerListings.length,
            responseTime: "Same day",
            shipSpeed: "2 business days",
            rating: "New seller",
            reviews: 0,
            joinedDate: "GRAIL Seller",
            location: "United States",
            bio: `Public collection for ${name}.`,
            collectionValue: totalValue,
            avgListingPrice: sellerListings.length
              ? Math.round(totalValue / sellerListings.length)
              : 0,
            fastShippingStreak: "Not available",
            responseScore: "New",
            cancellationRate: "N/A",
            sellerTags: ["Public Collection"],
            levelProgress: 0,
            buyerRating: "New",
            priceOffset: 0,
            route: `/collections/${slug}`,
            searchText: [
              name,
              profile.username,
              slug,
              `Public collection for ${name}.`,
              "GRAIL Seller",
              "Public Collection",
              ...sellerListings.map((listing) => listing.title || ""),
            ].join(" "),
          } satisfies CollectionSeller;
        });

        if (isMounted) {
          setRealSellers(mappedSellers);
        }
      } catch (error) {
        console.error("Collections profile fetch error:", error);
      }
    }

    loadRealCollections();

    return () => {
      isMounted = false;
    };
  }, []);

  const collections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const combinedSellers: CollectionSeller[] = [
      ...realSellers,
      ...mockSellers.filter(
        (mockSeller) => !realSellers.some((seller) => seller.slug === mockSeller.slug),
      ),
    ];

    return combinedSellers.filter((seller) => {
      if (activeFilter === "Top Sellers" && !seller.sellerTags.includes("Top Closer")) return false;
      if (activeFilter === "New Collections" && !["collector-corner", "pack-pilot"].includes(seller.slug)) return false;
      if (activeFilter === "Grail Collections" && seller.collectionValue < 70000) return false;
      if (query && ![
        seller.name,
        seller.slug,
        seller.bio,
        seller.level,
        seller.rewardsBadge,
        seller.searchText,
      ].join(" ").toLowerCase().includes(query)) return false;
      return true;
    });
  }, [activeFilter, realSellers, searchQuery]);

  function toggleFollow(slug: string) {
    setFollowed((items) =>
      items.includes(slug) ? items.filter((item) => item !== slug) : [...items, slug],
    );
  }

  return (
    <main className="collections-page">
      <style>{pageStyles}</style>
      <div className="collections-shell">
        <Header />

        <section className="page-heading">
          <span>Discovery</span>
          <h1>Collections</h1>
          <p>Discover seller collections, grail vaults, and curated card inventories.</p>
        </section>

        <section className="toolbar panel">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search collections..."
            aria-label="Search collections"
          />
          <div className="filter-buttons">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="collections-layout">
          <div className="collection-grid">
            {collections.map((seller) => {
              const listings = buildMockSellerListings(seller);
              const grailCount = listings.filter((listing) => listing.tag === "Grail").length;
              const hotCount = listings.filter((listing) => listing.tag === "Hot").length;

              return (
                <article key={seller.slug} className="collection-card panel">
                  <div className="seller-row">
                    <span className="avatar">{seller.initials}</span>
                    <div>
                      <h2>{seller.name}</h2>
                      <p>{seller.level} · {seller.rewardsBadge}</p>
                    </div>
                  </div>
                  <p>{seller.bio}</p>
                  <div className="metric-grid">
                    <span>Value <strong>{formatCurrency(seller.collectionValue)}</strong></span>
                    <span>Listings <strong>{seller.activeListings}</strong></span>
                    <span>Grails <strong>{grailCount}</strong></span>
                    <span>Hot <strong>{hotCount}</strong></span>
                    <span>Rating <strong>{seller.buyerRating} / 5</strong></span>
                    <span>Reviews <strong>{seller.reviews}</strong></span>
                  </div>
                  <div className="card-actions">
                    <Link href={seller.route}>View Collection</Link>
                    <button type="button" onClick={() => toggleFollow(seller.slug)}>
                      {followed.includes(seller.slug) ? "Following" : "Follow"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="side-stack">
            <section className="panel side-card">
              <h2>Featured Collections</h2>
              <p>VaultRunner</p>
              <p>GradeLane</p>
              <p>HoloHouse</p>
            </section>
            <section className="panel side-card">
              <h2>Rising Sellers</h2>
              <p>PackPilot</p>
              <p>CollectorCorner</p>
            </section>
            <section className="panel side-card">
              <h2>How to Earn Browse Placement</h2>
              <p>Complete sales, ship fast, respond quickly, keep listings accurate, and maintain strong reviews.</p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .collections-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .collections-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .page-heading { margin-top: 18px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .collection-card p, .side-card p { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .toolbar { margin-top: 18px; padding: 12px; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
  input { min-height: 40px; border: 1px solid #24242a; border-radius: 10px; background: #08080a; color: #fff; padding: 0 12px; font: inherit; font-size: 13px; font-weight: 800; outline: none; }
  .filter-buttons, .card-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  button, a { font-family: inherit; }
  .filter-buttons button, .card-actions a, .card-actions button { min-height: 36px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; }
  .filter-buttons button.active, .filter-buttons button:hover, .card-actions a:hover, .card-actions button:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); }
  .collections-layout { margin-top: 16px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
  .collection-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .collection-card, .side-card { padding: 16px; }
  .seller-row { display: grid; grid-template-columns: 54px 1fr; gap: 12px; align-items: center; }
  .avatar { width: 50px; height: 50px; border: 1px solid rgba(201,205,211,0.26); border-radius: 999px; background: linear-gradient(135deg, #1f2937, #050506); color: #E7DED0; display: flex; align-items: center; justify-content: center; font-weight: 900; }
  h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .metric-grid { margin: 14px 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .metric-grid span { border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); padding: 9px; color: #85858f; font-size: 11px; font-weight: 800; }
  .metric-grid strong { display: block; margin-top: 5px; color: #fff; font-size: 14px; }
  .side-stack { display: grid; gap: 14px; }
  @media (max-width: 1100px) { .collections-shell { width: calc(100vw - 32px); } .toolbar, .collections-layout, .collection-grid, .metric-grid { grid-template-columns: 1fr; } }
`;
