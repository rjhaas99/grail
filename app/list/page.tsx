"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { supabase } from "../../lib/supabase";

type CardType = "Raw" | "Graded";
type StatusType = "success" | "error" | "info";
type ImageType =
  | "front"
  | "back"
  | "top_corners"
  | "bottom_corners"
  | "surface"
  | "edges";

type PhotoType = {
  label: string;
  imageType: ImageType;
};

type SelectedPhoto = {
  file: File;
  previewUrl: string;
};

type PublishStatus = {
  type: StatusType;
  text: string;
};

type CreatedListing = {
  id: string;
};

const storageBucket = "card-images";

const photoTypes: PhotoType[] = [
  { label: "Front", imageType: "front" },
  { label: "Back", imageType: "back" },
  { label: "Top Corners", imageType: "top_corners" },
  { label: "Bottom Corners", imageType: "bottom_corners" },
  { label: "Surface", imageType: "surface" },
  { label: "Edges", imageType: "edges" },
];

const categories = ["Sports", "TCG"];
const rawConditions = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Very Good",
  "Good",
  "Poor",
];
const graders = ["PSA", "BGS", "CGC", "SGC", "Other"];
const psaGrades = [
  "10",
  "9",
  "8.5",
  "8",
  "7.5",
  "7",
  "6.5",
  "6",
  "5.5",
  "5",
  "4.5",
  "4",
  "3.5",
  "3",
  "2.5",
  "2",
  "1.5",
  "1",
  "Authentic",
];
const standardGrades = [
  "10",
  "9.5",
  "9",
  "8.5",
  "8",
  "7.5",
  "7",
  "6.5",
  "6",
  "5.5",
  "5",
  "4.5",
  "4",
  "3.5",
  "3",
  "2.5",
  "2",
  "1.5",
  "1",
  "Authentic",
];

function formatCurrency(value: string | number) {
  const number = Number(value);
  if (!number) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function sanitizeFileName(fileName: string) {
  const safeName = fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^\.+/, "");

  return safeName || "image";
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return String(error);
}

function ActionCircles() {
  return (
    <div className="action-circles" aria-hidden="true">
      <span className="cart-icon" />
      <span className="message-icon" />
      <span>$</span>
    </div>
  );
}

export default function ListCardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [publishedListingId, setPublishedListingId] = useState("");
  const [category, setCategory] = useState("Sports");
  const [cardType, setCardType] = useState<CardType>("Graded");
  const [title, setTitle] = useState("Crimson Court Rookie");
  const [year, setYear] = useState("2026");
  const [setName, setSetName] = useState("Crimson Court Archive");
  const [cardNumber, setCardNumber] = useState("CC-01");
  const [subject, setSubject] = useState("Rookie Guard");
  const [grader, setGrader] = useState("PSA");
  const [grade, setGrade] = useState("10");
  const [condition, setCondition] = useState("Near Mint");
  const [askingPrice, setAskingPrice] = useState("1240");
  const [minimumOffer, setMinimumOffer] = useState("1120");
  const [marketValue, setMarketValue] = useState("1320");
  const [selectedPhotos, setSelectedPhotos] = useState<
    Partial<Record<ImageType, SelectedPhoto>>
  >({});

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(currentSession);
        setIsCheckingAuth(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingAuth(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const gradeOptions = grader === "PSA" ? psaGrades : standardGrades;
  const subtitle =
    cardType === "Graded"
      ? `${category}: ${grader} ${grade}`
      : `${category}: ${condition}`;
  const frontPreview = selectedPhotos.front?.previewUrl;
  const badges = useMemo(() => {
    const next = [cardType === "Graded" ? "Graded" : "Raw"];
    if (Number(marketValue) >= 1200) next.push("Grail");
    return next;
  }, [cardType, marketValue]);
  const previewTitle = buildTitle() || "Untitled Card";

  function buildTitle() {
    if (title.trim()) {
      return title.trim();
    }

    if (cardType === "Graded") {
      return [year, setName, subject, grader, grade].filter(Boolean).join(" ");
    }

    return [year, setName, subject, condition].filter(Boolean).join(" ");
  }

  function handlePhotoChange(imageType: ImageType, file: File | undefined) {
    if (!file) {
      return;
    }

    setSelectedPhotos((current) => {
      const existing = current[imageType];
      if (existing?.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }

      return {
        ...current,
        [imageType]: {
          file,
          previewUrl: URL.createObjectURL(file),
        },
      };
    });
    setPublishedListingId("");
    setStatus({ type: "info", text: "Photo selected." });
  }

  function validateForm() {
    const priceNumber = Number(askingPrice);
    const minimumOfferNumber = Number(minimumOffer);

    if (!category.trim()) {
      return "Category is required.";
    }

    if (!subject.trim() && !title.trim()) {
      return "Player / character or card title is required.";
    }

    if (!cardType) {
      return "Card type is required.";
    }

    if (!askingPrice || Number.isNaN(priceNumber) || priceNumber <= 0) {
      return "Asking price must be a positive number.";
    }

    if (
      minimumOffer.trim() &&
      (!Number.isFinite(minimumOfferNumber) ||
        minimumOfferNumber > priceNumber)
    ) {
      return "Minimum offer must be less than or equal to asking price.";
    }

    if (cardType === "Raw" && !condition.trim()) {
      return "Condition is required for raw cards.";
    }

    if (cardType === "Graded" && (!grader.trim() || !grade.trim())) {
      return "Grader and grade are required for graded cards.";
    }

    return "";
  }

  async function uploadListingImages(listingId: string) {
    const imageRows: {
      listing_id: string;
      image_url: string;
      image_type: ImageType;
    }[] = [];
    const failedUploads: string[] = [];
    let hasPublicUrlError = false;
    const selectedEntries = photoTypes
      .map((photoType) => ({
        ...photoType,
        photo: selectedPhotos[photoType.imageType],
      }))
      .filter((entry) => entry.photo);

    for (const entry of selectedEntries) {
      const photo = entry.photo;
      if (!photo) continue;

      const safeFileName = sanitizeFileName(photo.file.name);
      const filePath = `listings/${listingId}/${entry.imageType}-${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, photo.file, {
          cacheControl: "3600",
          contentType: photo.file.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        console.error("Listing image upload error:", {
          bucketName: storageBucket,
          filePath,
          imageType: entry.imageType,
          fileName: photo.file.name,
          exactMessage: getErrorMessage(uploadError),
          error: uploadError,
        });
        failedUploads.push(entry.label);
        continue;
      }

      const { data } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        console.error("Listing image public URL error:", {
          bucketName: storageBucket,
          filePath,
          imageType: entry.imageType,
          fileName: photo.file.name,
          exactMessage:
            "No public URL was returned. Check that the card-images bucket exists and is public.",
        });
        hasPublicUrlError = true;
        failedUploads.push(entry.label);
        continue;
      }

      imageRows.push({
        listing_id: listingId,
        image_url: data.publicUrl,
        image_type: entry.imageType,
      });
    }

    if (imageRows.length > 0) {
      const { error: imageInsertError } = await supabase
        .from("listing_images")
        .insert(imageRows);

      if (imageInsertError) {
        console.error("Listing image row insert error:", {
          tableName: "listing_images",
          bucketName: storageBucket,
          rows: imageRows.map((row) => ({
            listing_id: row.listing_id,
            image_type: row.image_type,
            image_url: row.image_url,
          })),
          exactMessage: getErrorMessage(imageInsertError),
          error: imageInsertError,
        });
        return {
          uploadedCount: imageRows.length,
          hasImageInsertError: true,
          hasPublicUrlError,
          failedUploads,
        };
      }
    }

    return {
      uploadedCount: imageRows.length,
      hasImageInsertError: false,
      hasPublicUrlError,
      failedUploads,
    };
  }

  async function publishListing() {
    setStatus(null);
    setPublishedListingId("");

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      setSession(null);
      setStatus({ type: "error", text: "Sign in to publish listings." });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setStatus({ type: "error", text: validationError });
      return;
    }

    setIsPublishing(true);

    try {
      const priceNumber = Number(askingPrice);
      const listingTitle = buildTitle();

      const { data, error } = await supabase
        .from("listings")
        .insert({
          seller_id: currentSession.user.id,
          title: listingTitle,
          sport: clean(category),
          player: clean(subject),
          year: clean(year),
          brand: clean(setName),
          card_number: clean(cardNumber),
          card_type: cardType,
          grader: cardType === "Graded" ? clean(grader) : null,
          grade: cardType === "Graded" ? clean(grade) : null,
          condition: cardType === "Raw" ? clean(condition) : null,
          price: priceNumber,
          status: "active",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Listing insert error:", error);
        setStatus({
          type: "error",
          text: "Listing could not be published. Check the form and try again.",
        });
        return;
      }

      const createdListing = data as CreatedListing;
      const imageResult = await uploadListingImages(createdListing.id);

      setPublishedListingId(createdListing.id);

      if (
        imageResult.failedUploads.length > 0 ||
        imageResult.hasImageInsertError ||
        imageResult.hasPublicUrlError
      ) {
        setStatus({
          type: "success",
          text: "Listing created, but images failed to upload. Check Supabase Storage bucket and policies.",
        });
        return;
      }

      setStatus({ type: "success", text: "Listing published." });
    } catch (error) {
      console.error("Publish listing error:", error);
      setStatus({
        type: "error",
        text: "Listing could not be published. Please try again.",
      });
    } finally {
      setIsPublishing(false);
    }
  }

  function resetForm() {
    Object.values(selectedPhotos).forEach((photo) => {
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });

    setCategory("Sports");
    setCardType("Graded");
    setTitle("");
    setYear("");
    setSetName("");
    setCardNumber("");
    setSubject("");
    setGrader("PSA");
    setGrade("10");
    setCondition("Near Mint");
    setAskingPrice("");
    setMinimumOffer("");
    setMarketValue("");
    setSelectedPhotos({});
    setPublishedListingId("");
    setStatus({ type: "info", text: "Ready to list another card." });
  }

  return (
    <main className="list-page">
      <style>{pageStyles}</style>
      <div className="page-shell">
        <Header />

        <section className="page-heading">
          <span>Seller Tools</span>
          <h1>List a Card</h1>
          <p>
            Create a premium GRAIL listing for sports cards, TCG cards, slabs,
            and raw cards.
          </p>
        </section>

        {!isCheckingAuth && !session ? (
          <section className="auth-notice panel">
            <div>
              <strong>Sign in to publish listings.</strong>
              <p>You can prepare the listing here, but publishing requires an account.</p>
            </div>
            <Link href="/login">Sign In</Link>
          </section>
        ) : null}

        {status ? (
          <p className={`status-message ${status.type}`}>{status.text}</p>
        ) : null}

        {publishedListingId ? (
          <section className="publish-success panel">
            <strong>Listing published.</strong>
            <div>
              <Link href={`/cards/${publishedListingId}`}>View Listing</Link>
              <Link href="/browse">Browse Listings</Link>
              <button type="button" onClick={resetForm}>
                List Another Card
              </button>
            </div>
          </section>
        ) : null}

        <section className="list-layout">
          <div className="main-column">
            <section className="panel form-section">
              <h2>Photos</h2>
              <p>
                Raw cards should include corners, surface, and edge photos so
                buyers can inspect condition.
              </p>
              <div className="upload-grid">
                {photoTypes.map((type) => {
                  const photo = selectedPhotos[type.imageType];

                  return (
                    <label key={type.imageType} className="upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handlePhotoChange(
                            type.imageType,
                            event.target.files?.[0],
                          )
                        }
                      />
                      {photo ? (
                        <Image
                          className="upload-preview"
                          src={photo.previewUrl}
                          alt={`${type.label} preview`}
                          width={180}
                          height={120}
                          unoptimized
                        />
                      ) : null}
                      <strong>{type.label}</strong>
                      <span>{photo ? photo.file.name : "Upload"}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="panel form-section">
              <h2>Card Info</h2>
              <div className="field-grid">
                <label>
                  <span>Category</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {categories.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Card title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label>
                  <span>Year</span>
                  <input value={year} onChange={(event) => setYear(event.target.value)} />
                </label>
                <label>
                  <span>Set</span>
                  <input
                    value={setName}
                    onChange={(event) => setSetName(event.target.value)}
                  />
                </label>
                <label>
                  <span>Card number</span>
                  <input
                    value={cardNumber}
                    onChange={(event) => setCardNumber(event.target.value)}
                  />
                </label>
                <label>
                  <span>Player / Character</span>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </label>
                <label>
                  <span>Card type</span>
                  <select
                    value={cardType}
                    onChange={(event) =>
                      setCardType(event.target.value as CardType)
                    }
                  >
                    <option>Raw</option>
                    <option>Graded</option>
                  </select>
                </label>
                {cardType === "Raw" ? (
                  <label>
                    <span>Condition</span>
                    <select
                      value={condition}
                      onChange={(event) => setCondition(event.target.value)}
                    >
                      {rawConditions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Grader</span>
                      <select
                        value={grader}
                        onChange={(event) => setGrader(event.target.value)}
                      >
                        {graders.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Grade</span>
                      <select
                        value={grade}
                        onChange={(event) => setGrade(event.target.value)}
                      >
                        {gradeOptions.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>
            </section>

            <section className="panel form-section">
              <h2>Pricing</h2>
              <div className="field-grid three">
                <label>
                  <span>Asking price</span>
                  <input
                    value={askingPrice}
                    inputMode="decimal"
                    onChange={(event) => setAskingPrice(event.target.value)}
                  />
                </label>
                <label>
                  <span>Minimum offer</span>
                  <input
                    value={minimumOffer}
                    inputMode="decimal"
                    onChange={(event) => setMinimumOffer(event.target.value)}
                  />
                </label>
                <label>
                  <span>Market value placeholder</span>
                  <input
                    value={marketValue}
                    inputMode="decimal"
                    onChange={(event) => setMarketValue(event.target.value)}
                  />
                </label>
              </div>
              <p>Grail tag is based on market value, not asking price.</p>
              <p>
                Offers are available on every GRAIL listing. Sellers can set a
                minimum offer.
              </p>
            </section>

            <section className="panel form-section">
              <h2>Shipping</h2>
              <div className="field-grid three">
                <label>
                  <span>Shipping speed</span>
                  <select defaultValue="1-2 business days">
                    <option>1-2 business days</option>
                    <option>2-3 business days</option>
                    <option>3-5 business days</option>
                  </select>
                </label>
                <label>
                  <span>Shipping cost</span>
                  <input defaultValue="$14" />
                </label>
                <label className="toggle-field">
                  <span>Local pickup placeholder</span>
                  <button
                    type="button"
                    onClick={() =>
                      setStatus({
                        type: "info",
                        text: "Local pickup toggle mock only.",
                      })
                    }
                  >
                    Off
                  </button>
                </label>
              </div>
            </section>
          </div>

          <aside className="preview-column">
            <section className="panel preview-card">
              <h2>Live Listing Preview</h2>
              <div className="art-shell">
                {frontPreview ? (
                  <Image
                    className="front-preview"
                    src={frontPreview}
                    alt="Front card preview"
                    width={180}
                    height={230}
                    unoptimized
                  />
                ) : (
                  <div className={`mock-card ${cardType === "Raw" ? "raw-card" : ""}`}>
                    {cardType === "Graded" ? (
                      <div className="mock-label">
                        <span>
                          {grader} {grade}
                        </span>
                        <span>{category}</span>
                      </div>
                    ) : null}
                    <div className="mock-art">
                      <span />
                      <strong />
                    </div>
                  </div>
                )}
              </div>
              <div className="badge-row">
                {badges.map((badge) => (
                  <span key={badge}>{badge}</span>
                ))}
              </div>
              <h3>{previewTitle}</h3>
              <p>{subtitle}</p>
              <p>Seller: {session?.user.email || "GRAIL Seller"}</p>
              <strong>{formatCurrency(askingPrice)}</strong>
              <ActionCircles />
              <button
                type="button"
                className="view-card"
                onClick={() =>
                  setStatus({ type: "info", text: "Preview updated." })
                }
              >
                View Card
              </button>
            </section>

            <section className="panel action-panel">
              <button
                type="button"
                onClick={() => setStatus({ type: "info", text: "Draft saved." })}
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() =>
                  setStatus({ type: "info", text: "Preview updated." })
                }
              >
                Preview Listing
              </button>
              <button
                type="button"
                className="primary"
                disabled={!session || isCheckingAuth || isPublishing}
                onClick={publishListing}
              >
                {isPublishing ? "Publishing..." : "Publish Listing"}
              </button>
              {!session && !isCheckingAuth ? (
                <Link href="/login">Sign In to Publish</Link>
              ) : null}
              <Link href="/seller-dashboard">Back to Seller Dashboard</Link>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .list-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .page-shell { width: 1240px; margin: 0 auto; padding: 8px 0 38px; }
  .panel { border: 1px solid #1d1d22; border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)), rgba(5,5,6,0.92); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
  .page-heading { margin-top: 18px; }
  .page-heading span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .page-heading h1 { margin: 8px 0 0; color: #fff; font-size: 42px; line-height: 46px; font-weight: 900; }
  .page-heading p, .form-section p, .preview-card p, .status-message, .auth-notice p { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .auth-notice { margin-top: 16px; padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .auth-notice strong, .publish-success strong { color: #fff; font-size: 14px; line-height: 18px; font-weight: 900; }
  .auth-notice p { margin: 5px 0 0; }
  .auth-notice a, .publish-success a, .publish-success button { min-height: 38px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; white-space: nowrap; }
  .status-message { margin: 16px 0 0; border: 1px solid rgba(201,205,211,0.22); border-radius: 10px; background: rgba(201,205,211,0.06); color: #C9CDD3; padding: 10px; font-weight: 900; }
  .status-message.success { border-color: rgba(52,211,153,0.24); background: rgba(52,211,153,0.07); color: #86efac; }
  .status-message.error { border-color: rgba(248,113,113,0.28); background: rgba(248,113,113,0.08); color: #fca5a5; }
  .publish-success { margin-top: 16px; padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .publish-success div { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .list-layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  .main-column, .preview-column { display: grid; gap: 14px; }
  .form-section, .preview-card, .action-panel { padding: 16px; }
  h2 { margin: 0; color: #fff; font-size: 20px; line-height: 24px; font-weight: 900; }
  .upload-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .upload-box { min-height: 112px; border: 1px dashed rgba(201,205,211,0.24); border-radius: 10px; background: rgba(8,8,10,0.76); color: #fff; display: grid; place-items: center; gap: 4px; cursor: pointer; padding: 10px; box-sizing: border-box; overflow: hidden; }
  .upload-box:hover { border-color: rgba(231,222,208,0.5); background: rgba(231,222,208,0.06); }
  .upload-box input { display: none; }
  .upload-box span, label span { color: #C9CDD3; font-size: 12px; font-weight: 900; }
  .upload-box span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .upload-preview { width: 100%; max-height: 58px; border-radius: 7px; object-fit: cover; }
  .field-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .field-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  label { display: grid; gap: 7px; }
  input, select { border: 1px solid #24242a; border-radius: 10px; background: #08080a; color: #fff; min-height: 42px; padding: 0 12px; box-sizing: border-box; font: inherit; font-size: 13px; font-weight: 800; outline: none; }
  button, .action-panel a, .view-card { min-height: 40px; border: 1px solid rgba(231,222,208,0.28); border-radius: 10px; background: rgba(231,222,208,0.055); color: #fff; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 12px; font-weight: 900; cursor: pointer; }
  button:hover, .action-panel a:hover { border-color: rgba(231,222,208,0.62); background: rgba(231,222,208,0.11); }
  button:disabled { cursor: not-allowed; opacity: 0.45; }
  .primary { background: #E7DED0; color: #111; }
  .art-shell { margin: 16px auto 12px; width: 190px; height: 240px; border: 1px solid rgba(201,205,211,0.14); border-radius: 12px; background: #030304; display: flex; align-items: center; justify-content: center; }
  .front-preview { max-width: 160px; max-height: 216px; width: auto; height: auto; border-radius: 9px; object-fit: contain; box-shadow: 0 18px 34px rgba(0,0,0,0.62); }
  .mock-card { width: 132px; height: 196px; border: 1px solid rgba(244,244,245,0.48); border-radius: 9px; background: linear-gradient(180deg, #eeeeef 0%, #fafafa 16%, #d7d7da 17%, #111827 18%, #050506 100%); padding: 7px; box-sizing: border-box; }
  .mock-card.raw-card { background: linear-gradient(180deg, rgba(255,255,255,0.86), #15171b 10%, #050506 100%); }
  .mock-label { height: 26px; border-radius: 5px; background: #f8fafc; color: #111827; font-size: 7px; font-weight: 900; display: flex; align-items: center; justify-content: space-between; padding: 0 5px; }
  .mock-art { height: 124px; margin-top: 7px; border: 1px solid rgba(255,255,255,0.26); border-radius: 6px; position: relative; overflow: hidden; background: radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), linear-gradient(145deg, #8f1d2c, #111827 54%, #030304); }
  .raw-card .mock-art { height: 166px; margin-top: 0; background: radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), linear-gradient(145deg, #0f766e, #111827 54%, #030304); }
  .mock-art span { position: absolute; left: 28px; top: 30px; width: 70px; height: 70px; border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; }
  .mock-art strong { position: absolute; left: 52px; top: 42px; width: 34px; height: 74px; border-radius: 999px 999px 12px 12px; background: rgba(255,255,255,0.72); }
  .badge-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge-row span { border: 1px solid rgba(231,222,208,0.28); border-radius: 999px; color: #E7DED0; padding: 5px 9px; font-size: 10px; font-weight: 900; }
  .preview-card h3 { margin: 12px 0 0; color: #fff; font-size: 22px; line-height: 26px; font-weight: 900; }
  .preview-card > strong { display: block; margin-top: 8px; color: #fff; font-size: 28px; line-height: 32px; }
  .action-circles { margin-top: 14px; display: flex; gap: 10px; }
  .action-circles span { width: 42px; height: 42px; border: 1px solid rgba(231,222,208,0.26); border-radius: 999px; background: rgba(8,8,10,0.82); display: inline-flex; align-items: center; justify-content: center; color: #E7DED0; font-weight: 900; position: relative; }
  .cart-icon::before { content: ""; width: 17px; height: 12px; border: 2px solid currentColor; border-top: 0; border-radius: 0 0 4px 4px; display: block; }
  .cart-icon::after { content: ""; position: absolute; width: 19px; height: 2px; top: 13px; left: 10px; background: currentColor; transform: rotate(-8deg); }
  .message-icon::before { content: ""; width: 18px; height: 13px; border: 2px solid currentColor; border-radius: 4px; display: block; }
  .message-icon::after { content: ""; position: absolute; width: 8px; height: 8px; border-left: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(-45deg); bottom: 12px; }
  .view-card { margin-top: 14px; width: 100%; }
  .action-panel { display: grid; gap: 10px; }
  @media (max-width: 1100px) { .page-shell { width: calc(100vw - 32px); } .list-layout, .field-grid, .field-grid.three, .upload-grid { grid-template-columns: 1fr; } .auth-notice, .publish-success { align-items: flex-start; flex-direction: column; } }
`;
