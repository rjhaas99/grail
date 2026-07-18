"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import AdminLayout from "../AdminLayout";
import { isSupportedImageFile } from "../../lib/imageUpload";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/Header";

const adminEmails = ["ryanjhaas99@gmail.com"];

type HomepageListing = {
  id: string;
  title: string;
  sellerId?: string | null;
  sellerName: string;
  price: number;
  sport: string;
  condition: string;
  status: string;
  imageUrl?: string | null;
  createdAt?: string | null;
  homepageFeatured: boolean;
  homepageFeaturedOrder?: number | null;
  homepageFeaturedAt?: string | null;
  homepageFeaturedUntil?: string | null;
};

type HomepageBanner = {
  id?: string | null;
  bannerType: string;
  imageUrl: string;
  headline: string;
  supportingText: string;
  primaryButtonLabel: string;
  primaryButtonHref: string;
  isVisible: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

type HomepageResponse = {
  listings?: HomepageListing[];
  banner?: HomepageBanner | null;
  bannerSetupRequired?: boolean;
  error?: string;
};

type HomepageUpdateResponse = {
  listing?: {
    id: string;
    homepageFeatured: boolean;
    homepageFeaturedOrder?: number | null;
    homepageFeaturedAt?: string | null;
    homepageFeaturedUntil?: string | null;
  };
  banner?: HomepageBanner | null;
  error?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function toDateTimeInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function featuredUntilIso(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T23:59:59.000Z`).toISOString();
}

function dateTimeInputToIso(value?: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Unknown error";
}

const emptyBannerDraft: HomepageBanner = {
  id: null,
  bannerType: "image_banner",
  imageUrl: "",
  headline: "",
  supportingText: "",
  primaryButtonLabel: "",
  primaryButtonHref: "",
  isVisible: false,
  startAt: null,
  endAt: null,
};

export default function AdminHomepagePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [listings, setListings] = useState<HomepageListing[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "unfeatured">("all");
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});
  const [untilDrafts, setUntilDrafts] = useState<Record<string, string>>({});
  const [activeListingId, setActiveListingId] = useState("");
  const [bannerDraft, setBannerDraft] = useState<HomepageBanner>(emptyBannerDraft);
  const [isBannerSaving, setIsBannerSaving] = useState(false);
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const [bannerUploadPreviewUrl, setBannerUploadPreviewUrl] = useState("");
  const [bannerSetupRequired, setBannerSetupRequired] = useState(false);
  const hasBannerDraftEditsRef = useRef(false);

  const loadHomepageListings = useCallback(async () => {
    setIsLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin homepage auth error:", sessionError);
    }

    const email = session?.user.email?.toLowerCase() || "";

    if (!email || !adminEmails.includes(email)) {
      setAdminEmail(email);
      setIsAdmin(false);
      setListings([]);
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);
    setIsAdmin(true);

    try {
      const response = await fetch("/api/admin/homepage", {
        headers: {
          authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const payload = (await response.json()) as HomepageResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Homepage listings could not be loaded.");
      }

      const loadedListings = payload.listings || [];

      setListings(loadedListings);
      if (!hasBannerDraftEditsRef.current) {
        setBannerDraft(payload.banner ? payload.banner : emptyBannerDraft);
      }
      setBannerSetupRequired(Boolean(payload.bannerSetupRequired));
      setOrderDrafts(
        loadedListings.reduce<Record<string, string>>((accumulator, listing) => {
          accumulator[listing.id] =
            listing.homepageFeaturedOrder === null ||
            listing.homepageFeaturedOrder === undefined
              ? ""
              : String(listing.homepageFeaturedOrder);
          return accumulator;
        }, {}),
      );
      setUntilDrafts(
        loadedListings.reduce<Record<string, string>>((accumulator, listing) => {
          accumulator[listing.id] = toDateInputValue(listing.homepageFeaturedUntil);
          return accumulator;
        }, {}),
      );
      setStatusMessage(
        payload.bannerSetupRequired
          ? "Homepage banner table is not available yet. Run the SQL returned by Codex to enable banner editing."
          : loadedListings.length
            ? "Active listings loaded for homepage curation."
            : "No active listings are available to feature.",
      );
    } catch (error) {
      console.error("Admin homepage fetch error:", error);
      setListings([]);
      if (!hasBannerDraftEditsRef.current) {
        setBannerDraft(emptyBannerDraft);
      }
      setStatusMessage(
        error instanceof Error
          ? `Homepage curation could not load: ${error.message}`
          : "Homepage curation could not load.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHomepageListings();
  }, [loadHomepageListings]);

  useEffect(
    () => () => {
      if (bannerUploadPreviewUrl) {
        URL.revokeObjectURL(bannerUploadPreviewUrl);
      }
    },
    [bannerUploadPreviewUrl],
  );

  const visibleListings = useMemo(
    () =>
      listings.filter((listing) => {
        const haystack = `${listing.title} ${listing.sellerName} ${listing.sport} ${listing.condition}`.toLowerCase();
        const matchesSearch = haystack.includes(searchQuery.trim().toLowerCase());
        const matchesFilter =
          filter === "all" ||
          (filter === "featured" && listing.homepageFeatured) ||
          (filter === "unfeatured" && !listing.homepageFeatured);

        return matchesSearch && matchesFilter;
      }),
    [filter, listings, searchQuery],
  );

  const stats = useMemo(
    () => [
      { label: "Active listings", value: listings.length.toString() },
      {
        label: "Featured",
        value: listings.filter((listing) => listing.homepageFeatured).length.toString(),
      },
      {
        label: "Unfeatured",
        value: listings.filter((listing) => !listing.homepageFeatured).length.toString(),
      },
      {
        label: "Homepage banner",
        value: bannerDraft.isVisible ? "Visible" : "Hidden",
      },
    ],
    [bannerDraft.isVisible, listings],
  );
  const bannerPreviewImage = bannerUploadPreviewUrl || bannerDraft.imageUrl || "";

  const updateBannerDraft = useCallback((updater: (draft: HomepageBanner) => HomepageBanner) => {
    hasBannerDraftEditsRef.current = true;
    setBannerDraft(updater);
  }, []);

  async function updateFeatured(listing: HomepageListing, homepageFeatured: boolean) {
    setActiveListingId(listing.id);
    setStatusMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin homepage update session error:", sessionError);
    }

    if (!session?.access_token) {
      setStatusMessage("Sign in as an admin to curate homepage listings.");
      setActiveListingId("");
      return;
    }

    try {
      const response = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          listingId: listing.id,
          homepageFeatured,
          homepageFeaturedOrder: orderDrafts[listing.id] || null,
          homepageFeaturedUntil: featuredUntilIso(untilDrafts[listing.id]),
        }),
      });
      const payload = (await response.json()) as HomepageUpdateResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Featured listing could not be updated.");
      }

      setListings((items) =>
        items.map((item) =>
          item.id === listing.id
            ? {
                ...item,
                homepageFeatured: payload.listing?.homepageFeatured ?? homepageFeatured,
                homepageFeaturedOrder:
                  payload.listing?.homepageFeaturedOrder ??
                  (homepageFeatured && orderDrafts[listing.id]
                    ? Number(orderDrafts[listing.id])
                    : null),
                homepageFeaturedAt:
                  payload.listing?.homepageFeaturedAt || item.homepageFeaturedAt,
                homepageFeaturedUntil:
                  payload.listing?.homepageFeaturedUntil ||
                  (homepageFeatured ? featuredUntilIso(untilDrafts[listing.id]) : null),
              }
            : item,
        ),
      );
      setStatusMessage(
        homepageFeatured
          ? `${listing.title} is now homepage featured.`
          : `${listing.title} was removed from homepage featured.`,
      );
    } catch (error) {
      console.error("Admin homepage update error:", error);
      setStatusMessage(
        error instanceof Error ? error.message : "Featured listing could not be updated.",
      );
    } finally {
      setActiveListingId("");
    }
  }

  async function handleBannerImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isSupportedImageFile(file)) {
      setStatusMessage("Choose a valid image file for the homepage banner.");
      return;
    }

    const temporaryPreviewUrl = URL.createObjectURL(file);
    setBannerUploadPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return temporaryPreviewUrl;
    });
    setIsBannerUploading(true);
    setStatusMessage("Uploading homepage banner image...");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin homepage banner upload session error:", sessionError);
    }

    if (!session?.access_token) {
      setBannerUploadPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return "";
      });
      setIsBannerUploading(false);
      setStatusMessage("Sign in as an admin to upload a homepage banner image.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/homepage/banner-upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const data = (await response.json()) as {
        imageUrl?: string;
        filePath?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Banner image upload failed.");
      }

      if (!data.imageUrl) {
        throw new Error("No public URL was returned for the uploaded banner image.");
      }

      updateBannerDraft((draft) => ({
        ...draft,
        imageUrl: data.imageUrl || "",
      }));
      setBannerUploadPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return "";
      });
      setStatusMessage("Banner image uploaded. Save Homepage Banner to publish it.");
    } catch (error) {
      console.error("Admin homepage banner image upload error:", {
        fileName: file.name,
        exactMessage: getErrorMessage(error),
        error,
      });
      setBannerUploadPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return "";
      });
      setStatusMessage(
        error instanceof Error
          ? `Banner image upload failed: ${error.message}`
          : "Banner image upload failed.",
      );
    } finally {
      setIsBannerUploading(false);
    }
  }

  function removeBannerImage() {
    setBannerUploadPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return "";
    });
    updateBannerDraft((draft) => ({
      ...draft,
      imageUrl: "",
    }));
    setStatusMessage("Banner image removed from the draft. Save Homepage Banner to publish this change.");
  }

  async function saveHomepageBanner() {
    setIsBannerSaving(true);
    setStatusMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Admin homepage banner session error:", sessionError);
    }

    if (!session?.access_token) {
      setStatusMessage("Sign in as an admin to update the homepage banner.");
      setIsBannerSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "save_banner",
          banner: {
            ...bannerDraft,
            startAt: dateTimeInputToIso(bannerDraft.startAt || ""),
            endAt: dateTimeInputToIso(bannerDraft.endAt || ""),
          },
        }),
      });
      const payload = (await response.json()) as HomepageUpdateResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Homepage banner could not be saved.");
      }

      hasBannerDraftEditsRef.current = false;
      setBannerDraft(payload.banner ? payload.banner : emptyBannerDraft);
      setBannerUploadPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return "";
      });
      setBannerSetupRequired(false);
      setStatusMessage(
        payload.banner?.isVisible
          ? "Homepage banner saved and visible when its schedule is active."
          : "Homepage banner saved and hidden.",
      );
    } catch (error) {
      console.error("Admin homepage banner save error:", error);
      setStatusMessage(
        error instanceof Error ? error.message : "Homepage banner could not be saved.",
      );
    } finally {
      setIsBannerSaving(false);
    }
  }

  return (
    <main className="admin-homepage-page">
      <style>{pageStyles}</style>
      <AdminLayout />
      <div className="admin-homepage-shell">
        <Header />

        <section className="page-heading">
          <div>
            <span>Internal Admin</span>
            <h1>Homepage Curation</h1>
            <p>
              Choose active listings for the homepage hero carousel. Unselected
              slots automatically fall back to recent active listings.
            </p>
          </div>
          <Link href="/admin/payments">Payments Dashboard</Link>
        </section>

        {!isLoading && !isAdmin ? (
          <section className="panel access-panel">
            <h2>Access denied</h2>
            <p>
              {adminEmail
                ? `${adminEmail} is not allowed to view this internal page.`
                : "Sign in with an authorized admin account."}
            </p>
          </section>
        ) : null}

        {isAdmin ? (
          <>
            {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

            <section className="stats-grid" aria-label="Homepage curation summary">
              {stats.map((item) => (
                <article key={item.label} className="stat-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </section>

            <section className="panel banner-panel" aria-label="Homepage banner controls">
              <div className="panel-heading">
                <div>
                  <span>Homepage Banner</span>
                  <h2>Primary homepage communication</h2>
                </div>
                <button
                  type="button"
                  disabled={isBannerSaving || isBannerUploading || bannerSetupRequired}
                  onClick={saveHomepageBanner}
                >
                  {isBannerSaving ? "Saving..." : "Save Banner"}
                </button>
              </div>

              <div className="banner-admin-grid">
                <article className="banner-preview-card">
                  {bannerPreviewImage ? (
                    <span
                      className="banner-preview-image"
                      aria-hidden="true"
                      style={{ backgroundImage: `url(${bannerPreviewImage})` }}
                    />
                  ) : null}
                  <div className="banner-preview-content">
                    <span>{bannerDraft.bannerType || "Image Banner"}</span>
                    <h3>{bannerDraft.headline || "Homepage banner headline"}</h3>
                    <p>
                      {bannerDraft.supportingText ||
                        "Supporting text appears here when the banner is active."}
                    </p>
                    {bannerDraft.primaryButtonLabel ? (
                      <strong>{bannerDraft.primaryButtonLabel}</strong>
                    ) : null}
                  </div>
                </article>

                <div className="banner-form-grid">
                  <label className="visibility-row">
                    <input
                      type="checkbox"
                      checked={bannerDraft.isVisible}
                      onChange={(event) =>
                        updateBannerDraft((draft) => ({
                          ...draft,
                          isVisible: event.target.checked,
                        }))
                      }
                    />
                    <span>Visible when schedule is active</span>
                  </label>

                  <div className="banner-upload-field">
                    <div>
                      <span>Banner Image</span>
                      <p>
                        Upload a homepage banner image using the same storage flow as listing photos.
                      </p>
                    </div>
                    <div className="banner-upload-actions">
                      <label className="banner-upload-button">
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isBannerUploading || bannerSetupRequired}
                          onChange={handleBannerImageUpload}
                        />
                        {isBannerUploading
                          ? "Uploading..."
                          : bannerPreviewImage
                            ? "Replace Image"
                            : "Upload Image"}
                      </label>
                      {bannerPreviewImage ? (
                        <button
                          type="button"
                          disabled={isBannerUploading}
                          onClick={removeBannerImage}
                        >
                          Remove Image
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <label>
                    <span>Headline</span>
                    <input
                      value={bannerDraft.headline || ""}
                      onChange={(event) =>
                        updateBannerDraft((draft) => ({
                          ...draft,
                          headline: event.target.value,
                        }))
                      }
                      placeholder="Marketplace announcement"
                    />
                  </label>

                  <label>
                    <span>Supporting text</span>
                    <textarea
                      value={bannerDraft.supportingText || ""}
                      onChange={(event) =>
                        updateBannerDraft((draft) => ({
                          ...draft,
                          supportingText: event.target.value,
                        }))
                      }
                      placeholder="Short supporting copy for the homepage banner"
                      rows={4}
                    />
                  </label>

                  <div className="two-column-fields">
                    <label>
                      <span>Primary button</span>
                      <input
                        value={bannerDraft.primaryButtonLabel || ""}
                        onChange={(event) =>
                          updateBannerDraft((draft) => ({
                            ...draft,
                            primaryButtonLabel: event.target.value,
                          }))
                        }
                        placeholder="Browse Cards"
                      />
                    </label>
                    <label>
                      <span>Button destination</span>
                      <input
                        value={bannerDraft.primaryButtonHref || ""}
                        onChange={(event) =>
                          updateBannerDraft((draft) => ({
                            ...draft,
                            primaryButtonHref: event.target.value,
                          }))
                        }
                        placeholder="/browse"
                      />
                    </label>
                  </div>

                  <div className="two-column-fields">
                    <label>
                      <span>Start date</span>
                      <input
                        type="datetime-local"
                        value={toDateTimeInputValue(bannerDraft.startAt)}
                        onChange={(event) =>
                          updateBannerDraft((draft) => ({
                            ...draft,
                            startAt: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>End date</span>
                      <input
                        type="datetime-local"
                        value={toDateTimeInputValue(bannerDraft.endAt)}
                        onChange={(event) =>
                          updateBannerDraft((draft) => ({
                            ...draft,
                            endAt: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel filters-panel">
              <label>
                <span>Search active listings</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by card, seller, category, or grade"
                />
              </label>
              <label>
                <span>Filter</span>
                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as "all" | "featured" | "unfeatured")
                  }
                >
                  <option value="all">All active listings</option>
                  <option value="featured">Featured only</option>
                  <option value="unfeatured">Unfeatured only</option>
                </select>
              </label>
            </section>

            <section className="panel listings-panel">
              <div className="panel-heading">
                <div>
                  <span>Active Listings</span>
                  <h2>{visibleListings.length} visible listings</h2>
                </div>
                <button type="button" onClick={loadHomepageListings}>
                  Refresh
                </button>
              </div>

              {isLoading ? <p className="empty-state">Loading active listings...</p> : null}

              {!isLoading && visibleListings.length === 0 ? (
                <article className="empty-state">
                  <h3>No matching active listings.</h3>
                  <p>Listings with status active will appear here for curation.</p>
                </article>
              ) : null}

              {!isLoading
                ? visibleListings.map((listing) => (
                    <article key={listing.id} className="listing-card">
                      <div className="listing-image">
                        {listing.imageUrl ? (
                          <span
                            aria-label={listing.title}
                            style={{ backgroundImage: `url(${listing.imageUrl})` }}
                          />
                        ) : (
                          <strong>No photo</strong>
                        )}
                      </div>

                      <div className="listing-main">
                        <div className="listing-title-row">
                          <div>
                            <span>
                              {listing.homepageFeatured
                                ? "Homepage Featured"
                                : "Active Listing"}
                            </span>
                            <h3>{listing.title}</h3>
                          </div>
                          <Link href={`/cards/${listing.id}`}>View Card</Link>
                        </div>

                        <div className="detail-grid">
                          <Info label="Seller" value={listing.sellerName} />
                          <Info label="Price" value={formatCurrency(listing.price)} />
                          <Info label="Category" value={listing.sport} />
                          <Info label="Condition" value={listing.condition} />
                          <Info label="Listed" value={formatDate(listing.createdAt)} />
                          <Info
                            label="Featured until"
                            value={formatDate(listing.homepageFeaturedUntil)}
                          />
                        </div>

                        <div className="curation-controls">
                          <label>
                            <span>Display order</span>
                            <input
                              type="number"
                              min="0"
                              value={orderDrafts[listing.id] || ""}
                              onChange={(event) =>
                                setOrderDrafts((drafts) => ({
                                  ...drafts,
                                  [listing.id]: event.target.value,
                                }))
                              }
                              placeholder="0"
                            />
                          </label>
                          <label>
                            <span>Featured until</span>
                            <input
                              type="date"
                              value={untilDrafts[listing.id] || ""}
                              onChange={(event) =>
                                setUntilDrafts((drafts) => ({
                                  ...drafts,
                                  [listing.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>

                        <div className="listing-actions">
                          {listing.homepageFeatured ? (
                            <>
                              <button
                                type="button"
                                disabled={activeListingId === listing.id}
                                onClick={() => updateFeatured(listing, true)}
                              >
                                {activeListingId === listing.id ? "Saving..." : "Save Order"}
                              </button>
                              <button
                                type="button"
                                disabled={activeListingId === listing.id}
                                onClick={() => updateFeatured(listing, false)}
                              >
                                Remove Featured
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={activeListingId === listing.id}
                              onClick={() => updateFeatured(listing, true)}
                            >
                              {activeListingId === listing.id
                                ? "Saving..."
                                : "Mark Homepage Featured"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                : null}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyles = `
  .admin-homepage-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(231, 222, 208, 0.08), transparent 34rem),
      radial-gradient(circle at bottom right, rgba(201, 205, 211, 0.06), transparent 30rem),
      #050505;
    color: #f7f3ec;
  }

  .admin-homepage-shell {
    width: min(100%, 1460px);
    margin: 0 auto;
    padding: 0 24px 64px;
  }

  .page-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    padding: 44px 0 24px;
  }

  .page-heading span,
  .panel-heading span,
  .filters-panel label span,
  .banner-form-grid label span,
  .stat-card span,
  .listing-title-row span,
  .info-item span,
  .curation-controls label span {
    display: block;
    color: #C9CDD3;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .page-heading h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: clamp(34px, 5vw, 58px);
    line-height: 1;
    letter-spacing: 0;
  }

  .page-heading p {
    max-width: 760px;
    margin: 12px 0 0;
    color: #a1a1aa;
    font-size: 15px;
    line-height: 1.6;
    font-weight: 700;
  }

  .page-heading a,
  .panel-heading button,
  .banner-upload-button,
  .banner-upload-actions button,
  .listing-title-row a,
  .listing-actions button {
    border: 1px solid rgba(231, 222, 208, 0.28);
    border-radius: 8px;
    background: rgba(231, 222, 208, 0.08);
    color: #E7DED0;
    padding: 10px 13px;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .panel-heading button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .banner-upload-actions button:disabled,
  .banner-upload-button:has(input:disabled) {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .panel,
  .stat-card,
  .listing-card {
    border: 1px solid rgba(231, 222, 208, 0.15);
    border-radius: 10px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)),
      rgba(5, 5, 6, 0.9);
    box-shadow: 0 22px 48px rgba(0,0,0,0.28);
  }

  .status-message {
    margin: 0 0 18px;
    border: 1px solid rgba(201, 205, 211, 0.18);
    border-radius: 8px;
    background: rgba(201, 205, 211, 0.06);
    color: #E7DED0;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 800;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-card strong {
    display: block;
    margin-top: 8px;
    color: #fff;
    font-size: 30px;
    line-height: 1;
  }

  .filters-panel {
    display: grid;
    grid-template-columns: 1fr 240px;
    gap: 14px;
    padding: 16px;
    margin-bottom: 18px;
  }

  input,
  select,
  textarea {
    width: 100%;
    margin-top: 7px;
    border: 1px solid rgba(201, 205, 211, 0.18);
    border-radius: 8px;
    background: rgba(0,0,0,0.36);
    color: #fff;
    padding: 11px 12px;
    font: inherit;
    box-sizing: border-box;
  }

  textarea {
    min-height: 104px;
    resize: vertical;
    line-height: 1.45;
  }

  .banner-panel {
    padding: 16px;
    margin-bottom: 18px;
  }

  .banner-admin-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    gap: 16px;
    align-items: stretch;
  }

  .banner-preview-card {
    position: relative;
    min-height: 292px;
    border: 1px solid rgba(231, 222, 208, 0.18);
    border-radius: 10px;
    overflow: hidden;
    background:
      radial-gradient(circle at 82% 20%, rgba(231,222,208,0.14), transparent 30%),
      linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.01)),
      rgba(3,3,4,0.96);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .banner-preview-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0.34;
    filter: saturate(0.86);
  }

  .banner-preview-card::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(0,0,0,0.88), rgba(0,0,0,0.34)),
      linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.76));
    pointer-events: none;
  }

  .banner-preview-content {
    position: relative;
    z-index: 1;
    height: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    box-sizing: border-box;
  }

  .banner-preview-content span {
    color: #C9CDD3;
    font-size: 10px;
    line-height: 13px;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .banner-preview-content h3 {
    max-width: 440px;
    margin: 10px 0 0;
    color: #fff;
    font-size: 32px;
    line-height: 1.05;
    letter-spacing: 0;
  }

  .banner-preview-content p {
    max-width: 520px;
    margin: 12px 0 0;
    color: #d4d4d8;
    font-size: 14px;
    line-height: 1.55;
    font-weight: 700;
  }

  .banner-preview-content strong {
    width: max-content;
    margin-top: 18px;
    border: 1px solid rgba(231, 222, 208, 0.32);
    border-radius: 8px;
    background: rgba(231, 222, 208, 0.1);
    color: #E7DED0;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 900;
  }

  .banner-form-grid {
    display: grid;
    gap: 12px;
  }

  .banner-upload-field {
    border: 1px solid rgba(201, 205, 211, 0.14);
    border-radius: 8px;
    background: rgba(255,255,255,0.025);
    padding: 12px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
  }

  .banner-upload-field span {
    display: block;
    color: #C9CDD3;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .banner-upload-field p {
    margin: 6px 0 0;
    color: #a1a1aa;
    font-size: 12px;
    line-height: 1.45;
    font-weight: 700;
  }

  .banner-upload-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .banner-upload-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    box-sizing: border-box;
  }

  .banner-upload-button input {
    display: none;
  }

  .two-column-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .visibility-row {
    border: 1px solid rgba(201, 205, 211, 0.14);
    border-radius: 8px;
    background: rgba(255,255,255,0.025);
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .visibility-row input {
    width: 18px;
    height: 18px;
    margin: 0;
  }

  .visibility-row span {
    color: #f4f4f5;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: none;
  }

  .listings-panel {
    padding: 16px;
  }

  .panel-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  .panel-heading h2 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 24px;
    line-height: 1.1;
  }

  .listing-card {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 16px;
    padding: 14px;
  }

  .listing-card + .listing-card {
    margin-top: 12px;
  }

  .listing-image {
    min-height: 154px;
    border: 1px solid rgba(201, 205, 211, 0.16);
    border-radius: 8px;
    background: #08080a;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .listing-image span {
    width: 100%;
    height: 100%;
    min-height: 154px;
    background-size: cover;
    background-position: center;
    display: block;
  }

  .listing-image strong {
    color: #85858f;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .listing-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .listing-title-row h3 {
    margin: 6px 0 0;
    color: #fff;
    font-size: 20px;
    line-height: 1.2;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .info-item {
    border: 1px solid rgba(201, 205, 211, 0.12);
    border-radius: 8px;
    background: rgba(255,255,255,0.025);
    padding: 10px;
  }

  .info-item strong {
    display: block;
    margin-top: 6px;
    color: #fff;
    font-size: 13px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .curation-controls {
    display: grid;
    grid-template-columns: 180px 220px;
    gap: 12px;
    margin-top: 14px;
  }

  .listing-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  .listing-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .access-panel,
  .empty-state {
    padding: 20px;
  }

  .access-panel h2,
  .empty-state h3 {
    margin: 0;
    color: #fff;
  }

  .access-panel p,
  .empty-state p {
    margin: 8px 0 0;
    color: #a1a1aa;
    font-size: 14px;
    line-height: 1.55;
    font-weight: 700;
  }

  @media (max-width: 860px) {
    .admin-homepage-shell {
      padding: 0 14px 44px;
    }

    .page-heading,
    .panel-heading,
    .listing-title-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .stats-grid,
    .banner-admin-grid,
    .filters-panel,
    .listing-card,
    .detail-grid,
    .curation-controls,
    .two-column-fields,
    .banner-upload-field {
      grid-template-columns: 1fr;
    }

    .banner-upload-actions {
      justify-content: flex-start;
    }
  }
`;
