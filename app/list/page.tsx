"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { supabase } from "../../lib/supabase";

type CardType = "Raw" | "Graded";
type ListingMode = "sale" | "collection";
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

type ExistingImageRow = {
  image_url: string | null;
  image_type: ImageType | null;
};

type ExistingListingRow = {
  id: string;
  seller_id: string | null;
  title: string | null;
  sport: string | null;
  player: string | null;
  year: string | null;
  brand: string | null;
  card_number: string | null;
  card_type: string | null;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  condition: string | null;
  price: number | null;
  status: string | null;
  psa_verified?: boolean | null;
  psa_cert_number?: string | null;
  psa_grade?: string | null;
  psa_card_name?: string | null;
  psa_verified_at?: string | null;
  estimated_value?: number | null;
  sportscardspro_id?: string | null;
  sportscardspro_product_name?: string | null;
  sportscardspro_set_name?: string | null;
  sportscardspro_estimated_value?: number | null;
  sportscardspro_price_field?: string | null;
  sportscardspro_source_url?: string | null;
  sportscardspro_fetched_at?: string | null;
  listing_images: ExistingImageRow[] | null;
};

type PublishStatus = {
  type: StatusType;
  text: string;
};

type CreatedListing = {
  id: string;
};

type ListingDraft = {
  id: string;
  title: string;
  category: string;
  subject: string;
  year: string;
  brand: string;
  cardNumber: string;
  serialNumber?: string;
  customSerialNumber?: string;
  cardType: CardType;
  grader: string;
  grade: string;
  certNumber?: string;
  psaVerified?: boolean;
  psaGrade?: string;
  psaCardName?: string;
  psaVerifiedAt?: string;
  sportsCardsProId?: string;
  sportsCardsProProductName?: string;
  sportsCardsProSetName?: string;
  sportsCardsProEstimatedValue?: number | null;
  sportsCardsProPriceField?: string;
  sportsCardsProSourceUrl?: string;
  sportsCardsProFetchedAt?: string;
  condition: string;
  askingPrice: string;
  minimumOffer: string;
  marketValue: string;
  imagePreview: string;
  createdAt: string;
  updatedAt: string;
};

type PsaVerification = {
  verified: boolean;
  certNumber: string;
  grade: string;
  cardName: string;
  verifiedAt: string;
};

type PsaVerificationResponse = {
  verified?: boolean;
  certNumber?: string;
  grade?: string;
  cardName?: string;
  verifiedAt?: string;
  psaUrl?: string;
  error?: string;
};

type SportsCardsProCandidate = {
  sportsCardsProId: string;
  productName: string;
  setName: string;
};

type SportsCardsProValue = {
  sportsCardsProId: string;
  productName: string;
  setName: string;
  estimatedValue: number | null;
  priceFieldUsed: string;
  sourceUrl: string;
  fetchedAt: string;
};

type SportsCardsProSearchResponse = {
  candidates?: SportsCardsProCandidate[];
  error?: string;
};

type SportsCardsProValueResponse = Partial<SportsCardsProValue> & {
  error?: string;
};

const storageBucket = "card-images";
const draftStorageKey = "grail-listing-drafts";

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
const serialNumberOptions = [
  "Not Serial Numbered",
  "1/1",
  "/2",
  "/3",
  "/4",
  "/5",
  "/10",
  "/25",
  "/49",
  "/50",
  "/75",
  "/99",
  "/100",
  "/149",
  "/199",
  "/249",
  "/299",
  "/499",
  "Custom",
];

const sellerPolicyLinks = [
  { label: "Seller Rules", href: "/seller-rules" },
  { label: "Fees", href: "/fees" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Prohibited Items", href: "/prohibited-items" },
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

function readDrafts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedDrafts = window.localStorage.getItem(draftStorageKey);
    return storedDrafts ? (JSON.parse(storedDrafts) as ListingDraft[]) : [];
  } catch (error) {
    console.error("Draft read error:", error);
    return [];
  }
}

function writeDrafts(drafts: ListingDraft[]) {
  window.localStorage.setItem(draftStorageKey, JSON.stringify(drafts));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ActionCircles({ showBuy = true }: { showBuy?: boolean }) {
  return (
    <div className="action-circles" aria-hidden="true">
      {showBuy ? <span className="cart-icon" /> : null}
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
  const [editingDraftId, setEditingDraftId] = useState("");
  const [editListingId, setEditListingId] = useState("");
  const [isLoadingEditListing, setIsLoadingEditListing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [draftImagePreview, setDraftImagePreview] = useState("");
  const [existingImageUrls, setExistingImageUrls] = useState<
    Partial<Record<ImageType, string>>
  >({});
  const [listingMode, setListingMode] = useState<ListingMode>("sale");
  const [isAutoTitle, setIsAutoTitle] = useState(true);
  const [category, setCategory] = useState("Sports");
  const [cardType, setCardType] = useState<CardType>("Graded");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("2026");
  const [setName, setSetName] = useState("Crimson Court Archive");
  const [cardNumber, setCardNumber] = useState("CC-01");
  const [subject, setSubject] = useState("Rookie Guard");
  const [serialNumber, setSerialNumber] = useState("Not Serial Numbered");
  const [customSerialNumber, setCustomSerialNumber] = useState("");
  const [grader, setGrader] = useState("PSA");
  const [grade, setGrade] = useState("10");
  const [certNumber, setCertNumber] = useState("");
  const [psaVerification, setPsaVerification] = useState<PsaVerification | null>(null);
  const [psaStatus, setPsaStatus] = useState<PublishStatus | null>(null);
  const [isVerifyingPsa, setIsVerifyingPsa] = useState(false);
  const [condition, setCondition] = useState("Near Mint");
  const [askingPrice, setAskingPrice] = useState("1240");
  const [minimumOffer, setMinimumOffer] = useState("1120");
  const [marketValue, setMarketValue] = useState("1320");
  const [sportsCardsProCandidates, setSportsCardsProCandidates] = useState<
    SportsCardsProCandidate[]
  >([]);
  const [sportsCardsProValue, setSportsCardsProValue] =
    useState<SportsCardsProValue | null>(null);
  const [sportsCardsProStatus, setSportsCardsProStatus] =
    useState<PublishStatus | null>(null);
  const [isSearchingSportsCardsPro, setIsSearchingSportsCardsPro] = useState(false);
  const [isFetchingSportsCardsProValue, setIsFetchingSportsCardsProValue] =
    useState(false);
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const draftId = searchParams.get("draft");
    const isCollectionModeParam = searchParams.get("mode") === "collection";

    const modeTimer = window.setTimeout(() => {
      if (isCollectionModeParam) {
        setListingMode("collection");
        setAskingPrice("");
        setMinimumOffer("");
      }
    }, 0);

    if (!draftId || searchParams.get("edit")) {
      return () => window.clearTimeout(modeTimer);
    }

    const preloadTimer = window.setTimeout(() => {
      const draft = readDrafts().find((item) => item.id === draftId);

      if (!draft) {
        setStatus({ type: "error", text: "Draft was not found." });
        return;
      }

      setEditingDraftId(draft.id);
      setTitle(draft.title);
      setIsAutoTitle(false);
      setCategory(draft.category);
      setSubject(draft.subject);
      setYear(draft.year);
      setSetName(draft.brand);
      setCardNumber(draft.cardNumber);
      setSerialNumber(draft.serialNumber || "Not Serial Numbered");
      setCustomSerialNumber(draft.customSerialNumber || "");
      setCardType(draft.cardType);
      setGrader(draft.grader);
      setGrade(draft.grade);
      setCertNumber(draft.certNumber || "");
      setPsaVerification(
        draft.psaVerified
          ? {
              verified: true,
              certNumber: draft.certNumber || "",
              grade: draft.psaGrade || draft.grade || "",
              cardName: draft.psaCardName || draft.title || "",
              verifiedAt: draft.psaVerifiedAt || new Date().toISOString(),
            }
          : null,
      );
      setPsaStatus(
        draft.psaVerified
          ? { type: "success", text: "PSA certification verified." }
          : null,
      );
      setCondition(draft.condition);
      setAskingPrice(draft.askingPrice);
      setMinimumOffer(draft.minimumOffer);
      setMarketValue(draft.marketValue);
      setSportsCardsProValue(
        draft.sportsCardsProId && draft.sportsCardsProEstimatedValue
          ? {
              sportsCardsProId: draft.sportsCardsProId,
              productName: draft.sportsCardsProProductName || draft.title || "",
              setName: draft.sportsCardsProSetName || "",
              estimatedValue: draft.sportsCardsProEstimatedValue,
              priceFieldUsed: draft.sportsCardsProPriceField || "",
              sourceUrl:
                draft.sportsCardsProSourceUrl ||
                "https://www.sportscardspro.com",
              fetchedAt: draft.sportsCardsProFetchedAt || new Date().toISOString(),
            }
          : null,
      );
      setSportsCardsProStatus(
        draft.sportsCardsProId && draft.sportsCardsProEstimatedValue
          ? { type: "success", text: "SportsCardsPro estimate loaded." }
          : null,
      );
      setDraftImagePreview(draft.imagePreview);
      setStatus({ type: "info", text: "Draft loaded." });
    }, 0);

    return () => {
      window.clearTimeout(modeTimer);
      window.clearTimeout(preloadTimer);
    };
  }, []);

  useEffect(() => {
    const listingId = new URLSearchParams(window.location.search).get("edit");

    if (!listingId) {
      return;
    }

    const editId = listingId;
    let isMounted = true;

    async function loadEditListing() {
      await Promise.resolve();

      if (!isMounted) {
        return;
      }

      setEditListingId(editId);
      setEditingDraftId("");

      if (isCheckingAuth) {
        return;
      }

      if (!session?.user.id) {
        setStatus({
          type: "error",
          text: "Sign in to edit your listings.",
        });
        return;
      }

      setIsLoadingEditListing(true);

      try {
        const { data, error } = await supabase
          .from("listings")
          .select(
            `
              id,
              seller_id,
              title,
              sport,
              player,
              year,
              brand,
              card_number,
              card_type,
              grader,
              grade,
              cert_number,
              condition,
              price,
              status,
              psa_verified,
              psa_cert_number,
              psa_grade,
              psa_card_name,
              psa_verified_at,
              estimated_value,
              sportscardspro_id,
              sportscardspro_product_name,
              sportscardspro_set_name,
              sportscardspro_estimated_value,
              sportscardspro_price_field,
              sportscardspro_source_url,
              sportscardspro_fetched_at,
              listing_images (
                image_url,
                image_type
              )
            `,
          )
          .eq("id", editId)
          .eq("seller_id", session.user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          setStatus({
            type: "error",
            text: "Listing not found or you do not have permission to edit it.",
          });
          return;
        }

        const listing = data as ExistingListingRow;
        const nextCardType: CardType =
          listing.card_type?.toLowerCase() === "raw" ? "Raw" : "Graded";
        const nextImageUrls = (listing.listing_images || []).reduce<
          Partial<Record<ImageType, string>>
        >((imageMap, image) => {
          if (image.image_type && image.image_url) {
            imageMap[image.image_type] = image.image_url;
          }
          return imageMap;
        }, {});

        setCategory(listing.sport || "Sports");
        setCardType(nextCardType);
        setTitle(listing.title || "");
        setIsAutoTitle(false);
        setYear(listing.year || "");
        setSetName(listing.brand || "");
        setCardNumber(listing.card_number || "");
        setSubject(listing.player || "");
        setGrader(listing.grader || "PSA");
        setGrade(listing.grade || "10");
        setCertNumber(listing.cert_number || listing.psa_cert_number || "");
        setPsaVerification(
          listing.psa_verified
            ? {
                verified: true,
                certNumber: listing.psa_cert_number || listing.cert_number || "",
                grade: listing.psa_grade || listing.grade || "",
                cardName: listing.psa_card_name || listing.title || "",
                verifiedAt: listing.psa_verified_at || new Date().toISOString(),
              }
            : null,
        );
        setPsaStatus(
          listing.psa_verified
            ? { type: "success", text: "PSA certification verified." }
            : null,
        );
        setCondition(listing.condition || "Near Mint");
        setAskingPrice(listing.price ? String(listing.price) : "");
        setMinimumOffer("");
        setMarketValue(
          listing.sportscardspro_estimated_value
            ? String(listing.sportscardspro_estimated_value)
            : listing.estimated_value
              ? String(listing.estimated_value)
              : "",
        );
        setSportsCardsProValue(
          listing.sportscardspro_id && listing.sportscardspro_estimated_value
            ? {
                sportsCardsProId: listing.sportscardspro_id,
                productName: listing.sportscardspro_product_name || listing.title || "",
                setName: listing.sportscardspro_set_name || "",
                estimatedValue: listing.sportscardspro_estimated_value,
                priceFieldUsed: listing.sportscardspro_price_field || "",
                sourceUrl:
                  listing.sportscardspro_source_url ||
                  "https://www.sportscardspro.com",
                fetchedAt:
                  listing.sportscardspro_fetched_at || new Date().toISOString(),
              }
            : null,
        );
        setSportsCardsProStatus(
          listing.sportscardspro_id && listing.sportscardspro_estimated_value
            ? { type: "success", text: "SportsCardsPro estimate loaded." }
            : null,
        );
        setSportsCardsProCandidates([]);
        setSelectedPhotos({});
        setDraftImagePreview("");
        setExistingImageUrls(nextImageUrls);
        setPublishedListingId("");
        setStatus({ type: "info", text: "Listing loaded for editing." });
      } catch (error) {
        console.error("Edit listing load error:", error);
        setStatus({
          type: "error",
          text: "Listing not found or you do not have permission to edit it.",
        });
      } finally {
        if (isMounted) {
          setIsLoadingEditListing(false);
        }
      }
    }

    loadEditListing();

    return () => {
      isMounted = false;
    };
  }, [isCheckingAuth, session?.user.id]);

  const gradeOptions = grader === "PSA" ? psaGrades : standardGrades;
  const isEditMode = Boolean(editListingId);
  const isCollectionMode = listingMode === "collection";
  const serialDisplay =
    serialNumber === "Custom"
      ? customSerialNumber.trim()
      : serialNumber === "Not Serial Numbered"
        ? ""
        : serialNumber;
  const generatedTitle = useMemo(() => {
    const conditionPart = cardType === "Graded" ? `${grader} ${grade}` : condition;
    return [year, setName, subject, serialDisplay, conditionPart]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
  }, [cardType, condition, grade, grader, serialDisplay, setName, subject, year]);
  const subtitle =
    cardType === "Graded"
      ? `${category}: ${grader} ${grade}`
      : `${category}: ${condition}`;
  const frontPreview =
    selectedPhotos.front?.previewUrl ||
    draftImagePreview ||
    existingImageUrls.front ||
    "";
  const badges = useMemo(() => {
    const next = [cardType === "Graded" ? "Graded" : "Raw"];
    if (Number(marketValue) >= 1200) next.push("Grail");
    return next;
  }, [cardType, marketValue]);
  const previewTitle = buildTitle() || "Untitled Card";

  function buildTitle() {
    if (!isAutoTitle && title.trim()) {
      return title.trim();
    }

    return generatedTitle;
  }

  function clearPsaVerification() {
    setPsaVerification(null);
    setPsaStatus(null);
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
    if (imageType === "front") {
      setDraftImagePreview("");
    }
    setPublishedListingId("");
    setStatus({ type: "info", text: "Photo selected." });
  }

  async function buildDraftPayload() {
    const now = new Date().toISOString();
    const existingDraft = editingDraftId
      ? readDrafts().find((draft) => draft.id === editingDraftId)
      : undefined;
    const imagePreview = selectedPhotos.front?.file
      ? await fileToDataUrl(selectedPhotos.front.file)
      : draftImagePreview;
    const draftTitle =
      buildTitle() ||
      [year, setName, subject, cardType === "Graded" ? `${grader} ${grade}` : condition]
        .filter(Boolean)
        .join(" ") ||
      "Untitled Draft";

    return {
      id: existingDraft?.id || `draft-${Date.now()}`,
      title: draftTitle,
      category,
      subject,
      year,
      brand: setName,
      cardNumber,
      serialNumber,
      customSerialNumber,
      cardType,
      grader,
      grade,
      certNumber,
      psaVerified: Boolean(psaVerification?.verified),
      psaGrade: psaVerification?.grade || "",
      psaCardName: psaVerification?.cardName || "",
      psaVerifiedAt: psaVerification?.verifiedAt || "",
      sportsCardsProId: sportsCardsProValue?.sportsCardsProId || "",
      sportsCardsProProductName: sportsCardsProValue?.productName || "",
      sportsCardsProSetName: sportsCardsProValue?.setName || "",
      sportsCardsProEstimatedValue: sportsCardsProValue?.estimatedValue ?? null,
      sportsCardsProPriceField: sportsCardsProValue?.priceFieldUsed || "",
      sportsCardsProSourceUrl: sportsCardsProValue?.sourceUrl || "",
      sportsCardsProFetchedAt: sportsCardsProValue?.fetchedAt || "",
      condition,
      askingPrice,
      minimumOffer,
      marketValue,
      imagePreview,
      createdAt: existingDraft?.createdAt || now,
      updatedAt: now,
    } satisfies ListingDraft;
  }

  async function saveDraft() {
    try {
      const draft = await buildDraftPayload();
      const otherDrafts = readDrafts().filter((item) => item.id !== draft.id);
      writeDrafts([draft, ...otherDrafts]);
      setEditingDraftId(draft.id);
      setDraftImagePreview(draft.imagePreview);
      setPublishedListingId("");
      setStatus({ type: "success", text: "Draft saved." });
    } catch (error) {
      console.error("Draft save error:", error);
      setStatus({ type: "error", text: "Draft could not be saved." });
    }
  }

  function previewListing() {
    const validationError = validateForm();

    if (validationError) {
      setStatus({
        type: "error",
        text: "Add the required listing details before previewing.",
      });
      return;
    }

    setStatus(null);
    setIsPreviewOpen(true);
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

    if (!isCollectionMode && (!askingPrice || Number.isNaN(priceNumber) || priceNumber <= 0)) {
      return "Asking price must be a positive number.";
    }

    if (minimumOffer.trim() && (!Number.isFinite(minimumOfferNumber) || minimumOfferNumber <= 0)) {
      return "Minimum offer must be a positive number.";
    }

    if (!isCollectionMode && minimumOffer.trim() && minimumOfferNumber > priceNumber) {
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

  async function verifyPsaCertification(options: { silent?: boolean } = {}) {
    const cleanCert = certNumber.replace(/[^0-9]/g, "").trim();

    if (cardType !== "Graded" || grader !== "PSA") {
      if (!options.silent) {
        setPsaStatus({
          type: "info",
          text: "PSA verification is only available for graded PSA cards.",
        });
      }
      return null;
    }

    if (!cleanCert) {
      if (!options.silent) {
        setPsaStatus({
          type: "error",
          text: "Enter a PSA cert number before verifying.",
        });
      }
      return null;
    }

    setIsVerifyingPsa(true);
    if (!options.silent) {
      setPsaStatus({ type: "info", text: "Verifying PSA certification..." });
    }

    try {
      const response = await fetch("/api/psa/verify-cert", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ certNumber: cleanCert }),
      });
      const payload = (await response.json()) as PsaVerificationResponse;

      if (!response.ok) {
        throw new Error(payload.error || "PSA verification failed.");
      }

      if (!payload.verified) {
        setPsaVerification(null);
        setPsaStatus({
          type: "error",
          text: payload.error || "Unable to verify PSA certification.",
        });
        return null;
      }

      const verification = {
        verified: true,
        certNumber: payload.certNumber || cleanCert,
        grade: payload.grade || "",
        cardName: payload.cardName || "",
        verifiedAt: payload.verifiedAt || new Date().toISOString(),
      } satisfies PsaVerification;

      setPsaVerification(verification);
      setPsaStatus({
        type: "success",
        text: "PSA certification verified.",
      });
      return verification;
    } catch (error) {
      console.error("PSA verification error:", error);
      setPsaVerification(null);
      setPsaStatus({
        type: "error",
        text: error instanceof Error && error.message
          ? error.message
          : "Unable to verify PSA certification.",
      });
      return null;
    } finally {
      setIsVerifyingPsa(false);
    }
  }

  async function getPsaVerificationForSave() {
    const cleanCert = certNumber.replace(/[^0-9]/g, "").trim();
    const isPsaCard = cardType === "Graded" && grader === "PSA" && cleanCert;

    if (!isPsaCard) {
      return null;
    }

    if (psaVerification?.certNumber === cleanCert) {
      return psaVerification;
    }

    return verifyPsaCertification({ silent: true });
  }

  function buildSportsCardsProPayload() {
    return {
      category,
      year,
      brand: setName,
      player: subject,
      cardNumber,
      cardType,
      grader,
      grade,
    };
  }

  async function getAuthenticatedHeaders() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession?.access_token) {
      return null;
    }

    return {
      authorization: `Bearer ${currentSession.access_token}`,
      "content-type": "application/json",
    };
  }

  async function findSportsCardsProMarketValue() {
    setSportsCardsProStatus(null);
    setSportsCardsProCandidates([]);
    setSportsCardsProValue(null);

    if (!year.trim() && !setName.trim() && !subject.trim() && !cardNumber.trim()) {
      setSportsCardsProStatus({
        type: "error",
        text: "Add card details before searching SportsCardsPro.",
      });
      return;
    }

    const headers = await getAuthenticatedHeaders();

    if (!headers) {
      setSportsCardsProStatus({
        type: "error",
        text: "Sign in to find SportsCardsPro market values.",
      });
      return;
    }

    setIsSearchingSportsCardsPro(true);
    setSportsCardsProStatus({
      type: "info",
      text: "Searching SportsCardsPro...",
    });

    try {
      const response = await fetch("/api/sportscardspro/search", {
        method: "POST",
        headers,
        body: JSON.stringify(buildSportsCardsProPayload()),
      });
      const payload = (await response.json()) as SportsCardsProSearchResponse;

      if (!response.ok) {
        throw new Error(payload.error || "SportsCardsPro search failed.");
      }

      const candidates = payload.candidates || [];
      setSportsCardsProCandidates(candidates);

      if (payload.error) {
        setSportsCardsProStatus({ type: "error", text: payload.error });
        return;
      }

      if (candidates.length === 0) {
        setSportsCardsProStatus({
          type: "info",
          text: "No SportsCardsPro matches found.",
        });
        return;
      }

      setSportsCardsProStatus({
        type: "success",
        text: "Select the matching SportsCardsPro card.",
      });
    } catch (error) {
      console.error("SportsCardsPro search error:", error);
      setSportsCardsProStatus({
        type: "error",
        text: error instanceof Error
          ? error.message
          : "SportsCardsPro search is unavailable right now.",
      });
    } finally {
      setIsSearchingSportsCardsPro(false);
    }
  }

  async function selectSportsCardsProCandidate(candidate: SportsCardsProCandidate) {
    const headers = await getAuthenticatedHeaders();

    if (!headers) {
      setSportsCardsProStatus({
        type: "error",
        text: "Sign in to retrieve SportsCardsPro market values.",
      });
      return;
    }

    setIsFetchingSportsCardsProValue(true);
    setSportsCardsProStatus({
      type: "info",
      text: "Retrieving SportsCardsPro value...",
    });

    try {
      const response = await fetch("/api/sportscardspro/value", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sportsCardsProId: candidate.sportsCardsProId,
          cardType,
          grader,
          grade,
        }),
      });
      const payload = (await response.json()) as SportsCardsProValueResponse;

      if (!response.ok) {
        throw new Error(payload.error || "SportsCardsPro value failed.");
      }

      if (payload.error || payload.estimatedValue === null || payload.estimatedValue === undefined) {
        setSportsCardsProValue(null);
        setSportsCardsProStatus({
          type: "error",
          text: payload.error || "SportsCardsPro has no value for this grade.",
        });
        return;
      }

      const value = {
        sportsCardsProId: payload.sportsCardsProId || candidate.sportsCardsProId,
        productName: payload.productName || candidate.productName,
        setName: payload.setName || candidate.setName,
        estimatedValue: payload.estimatedValue,
        priceFieldUsed: payload.priceFieldUsed || "",
        sourceUrl: payload.sourceUrl || "https://www.sportscardspro.com",
        fetchedAt: payload.fetchedAt || new Date().toISOString(),
      } satisfies SportsCardsProValue;

      setSportsCardsProValue(value);
      setMarketValue(String(value.estimatedValue));
      setSportsCardsProStatus({
        type: "success",
        text: "SportsCardsPro estimate selected.",
      });
    } catch (error) {
      console.error("SportsCardsPro value error:", error);
      setSportsCardsProValue(null);
      setSportsCardsProStatus({
        type: "error",
        text: error instanceof Error
          ? error.message
          : "SportsCardsPro value is unavailable right now.",
      });
    } finally {
      setIsFetchingSportsCardsProValue(false);
    }
  }

  function useSportsCardsProAskingPrice() {
    if (sportsCardsProValue?.estimatedValue) {
      setAskingPrice(String(sportsCardsProValue.estimatedValue));
      setStatus({
        type: "success",
        text: "SportsCardsPro estimate copied to asking price.",
      });
    }
  }

  function buildListingFields(verification: PsaVerification | null = psaVerification) {
    const cleanCert = certNumber.replace(/[^0-9]/g, "").trim();
    const shouldStorePsa = cardType === "Graded" && grader === "PSA" && cleanCert;
    const manualMarketValue = Number(marketValue);
    const savedEstimatedValue =
      Number.isFinite(manualMarketValue) && manualMarketValue > 0
        ? manualMarketValue
        : sportsCardsProValue?.estimatedValue || null;

    return {
      title: buildTitle(),
      sport: clean(category),
      player: clean(subject),
      year: clean(year),
      brand: clean(setName),
      card_number: clean(cardNumber),
      card_type: cardType,
      grader: cardType === "Graded" ? clean(grader) : null,
      grade: cardType === "Graded" ? clean(grade) : null,
      cert_number: cardType === "Graded" ? clean(cleanCert) : null,
      condition: cardType === "Raw" ? clean(condition) : null,
      price: isCollectionMode ? null : Number(askingPrice),
      estimated_value: savedEstimatedValue,
      collection_note: serialDisplay ? `Serial Number: ${serialDisplay}` : null,
      psa_verified: shouldStorePsa ? Boolean(verification?.verified) : false,
      psa_cert_number: shouldStorePsa ? cleanCert : null,
      psa_grade: shouldStorePsa ? verification?.grade || null : null,
      psa_card_name: shouldStorePsa ? verification?.cardName || null : null,
      psa_verified_at: shouldStorePsa && verification?.verifiedAt
        ? verification.verifiedAt
        : null,
      sportscardspro_id: sportsCardsProValue?.sportsCardsProId || null,
      sportscardspro_product_name: sportsCardsProValue?.productName || null,
      sportscardspro_set_name: sportsCardsProValue?.setName || null,
      sportscardspro_estimated_value: sportsCardsProValue?.estimatedValue || null,
      sportscardspro_price_field: sportsCardsProValue?.priceFieldUsed || null,
      sportscardspro_source_url: sportsCardsProValue?.sourceUrl || null,
      sportscardspro_fetched_at: sportsCardsProValue?.fetchedAt || null,
    };
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

  async function saveListingChanges() {
    setStatus(null);
    setPublishedListingId("");

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      setSession(null);
      setStatus({ type: "error", text: "Sign in to edit your listings." });
      return;
    }

    if (!editListingId) {
      setStatus({ type: "error", text: "No listing is loaded for editing." });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setStatus({ type: "error", text: validationError });
      return;
    }

    setIsPublishing(true);

    try {
      const verifiedPsa = await getPsaVerificationForSave();
      const { data, error } = await supabase
        .from("listings")
        .update(buildListingFields(verifiedPsa))
        .eq("id", editListingId)
        .eq("seller_id", currentSession.user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setStatus({
          type: "error",
          text: "Listing not found or you do not have permission to edit it.",
        });
        return;
      }

      const imageResult = await uploadListingImages(editListingId);
      setPublishedListingId(editListingId);

      if (
        imageResult.failedUploads.length > 0 ||
        imageResult.hasImageInsertError ||
        imageResult.hasPublicUrlError
      ) {
        setStatus({
          type: "success",
          text: "Listing updated, but one or more new images failed to upload.",
        });
        return;
      }

      setStatus({ type: "success", text: "Listing updated." });
    } catch (error) {
      console.error("Update listing error:", error);
      setStatus({
        type: "error",
        text: "Listing could not be updated. Please try again.",
      });
    } finally {
      setIsPublishing(false);
    }
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
      const verifiedPsa = await getPsaVerificationForSave();
      const { data, error } = await supabase
        .from("listings")
        .insert({
          seller_id: currentSession.user.id,
          ...buildListingFields(verifiedPsa),
          status: isCollectionMode ? "collection" : "active",
          is_collection_card: isCollectionMode,
          is_public_collection: isCollectionMode,
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
      try {
        await fetch("/api/notifications/system", {
          method: "POST",
          headers: {
            authorization: `Bearer ${currentSession.access_token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            kind: "listing_live",
            listingId: createdListing.id,
          }),
        });
      } catch (notificationError) {
        console.warn("Listing live notification skipped:", notificationError);
      }

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

      setStatus({
        type: "success",
        text: isCollectionMode ? "Card added to collection." : "Listing published.",
      });
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
    setIsAutoTitle(true);
    setYear("");
    setSetName("");
    setCardNumber("");
    setSerialNumber("Not Serial Numbered");
    setCustomSerialNumber("");
    setSubject("");
    setGrader("PSA");
    setGrade("10");
    setCertNumber("");
    setPsaVerification(null);
    setPsaStatus(null);
    setCondition("Near Mint");
    setAskingPrice("");
    setMinimumOffer("");
    setMarketValue("");
    setSportsCardsProCandidates([]);
    setSportsCardsProValue(null);
    setSportsCardsProStatus(null);
    setSelectedPhotos({});
    setDraftImagePreview("");
    setExistingImageUrls({});
    setEditingDraftId("");
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
          <h1>{isEditMode ? "Edit Listing" : "List a Card"}</h1>
          <p>
            {isEditMode
              ? "Update your GRAIL listing details, price, and listing photos."
              : isCollectionMode
                ? "Add a card to your public GRAIL collection without listing it for sale."
                : "Create a premium GRAIL listing for sports cards, TCG cards, slabs, and raw cards."}
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
        {isLoadingEditListing ? (
          <p className="status-message info">Loading listing for editing...</p>
        ) : null}

        {publishedListingId ? (
          <section className="publish-success panel">
            <strong>
              {isEditMode
                ? "Listing updated."
                : isCollectionMode
                  ? "Card added to collection."
                  : "Listing published."}
            </strong>
            <div>
              <Link href={`/cards/${publishedListingId}`}>View Listing</Link>
              <Link href="/browse">Browse Listings</Link>
              {!isEditMode ? (
                <button type="button" onClick={resetForm}>
                  List Another Card
                </button>
              ) : null}
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
                  const existingImageUrl = existingImageUrls[type.imageType];

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
                      {photo || existingImageUrl ? (
                        <Image
                          className="upload-preview"
                          src={photo?.previewUrl || existingImageUrl || ""}
                          alt={`${type.label} preview`}
                          width={180}
                          height={120}
                          unoptimized
                        />
                      ) : null}
                      <strong>{type.label}</strong>
                      <span>{photo ? photo.file.name : existingImageUrl ? "Current image" : "Upload"}</span>
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
                    value={isAutoTitle ? generatedTitle : title}
                    onChange={(event) => {
                      setIsAutoTitle(false);
                      setTitle(event.target.value);
                    }}
                  />
                  <small>
                    Auto title: {generatedTitle || "Add card details to generate a title."}
                  </small>
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
                  <span>Serial Number</span>
                  <select
                    value={serialNumber}
                    onChange={(event) => setSerialNumber(event.target.value)}
                  >
                    {serialNumberOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                {serialNumber === "Custom" ? (
                  <label>
                    <span>Custom serial</span>
                    <input
                      value={customSerialNumber}
                      onChange={(event) => setCustomSerialNumber(event.target.value)}
                      placeholder="/35 or 12/99"
                    />
                  </label>
                ) : null}
                <label className="toggle-field">
                  <span>Title mode</span>
                  <button type="button" onClick={() => setIsAutoTitle(true)}>
                    Use Auto Title
                  </button>
                </label>
                <label>
                  <span>Card type</span>
                  <select
                    value={cardType}
                    onChange={(event) => {
                      setCardType(event.target.value as CardType);
                      clearPsaVerification();
                    }}
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
                        onChange={(event) => {
                          setGrader(event.target.value);
                          clearPsaVerification();
                        }}
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
                    <label>
                      <span>Certification Number</span>
                      <input
                        value={certNumber}
                        inputMode="numeric"
                        placeholder={grader === "PSA" ? "PSA cert number" : "Optional cert number"}
                        onChange={(event) => {
                          setCertNumber(event.target.value);
                          clearPsaVerification();
                        }}
                      />
                    </label>
                    {grader === "PSA" ? (
                      <div className="psa-verification-box">
                        <div>
                          <span>PSA Certification</span>
                          <strong>
                            {psaVerification?.verified
                              ? "PSA Certified"
                              : "Not verified yet"}
                          </strong>
                          {psaVerification?.cardName ? (
                            <p>{psaVerification.cardName}</p>
                          ) : (
                            <p>Verify the cert before or during save.</p>
                          )}
                          {psaStatus ? (
                            <p className={`psa-status ${psaStatus.type}`}>
                              {psaStatus.text}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={isVerifyingPsa || !certNumber.trim()}
                          onClick={() => void verifyPsaCertification()}
                        >
                          {isVerifyingPsa ? "Verifying..." : "Verify PSA"}
                        </button>
                      </div>
                    ) : null}
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
                    disabled={isCollectionMode}
                    placeholder={isCollectionMode ? "In Collection" : undefined}
                    onChange={(event) => setAskingPrice(event.target.value)}
                  />
                </label>
                <label>
                  <span>Minimum offer</span>
                  <input
                    value={minimumOffer}
                    inputMode="decimal"
                    placeholder={isCollectionMode ? "Optional minimum offer" : undefined}
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
              <div className="market-value-box">
                <div className="market-value-header">
                  <div>
                    <span>SportsCardsPro Market Value</span>
                    <strong>
                      {sportsCardsProValue?.estimatedValue
                        ? formatCurrency(sportsCardsProValue.estimatedValue)
                        : "No estimate selected"}
                    </strong>
                  </div>
                  <button
                    type="button"
                    disabled={
                      isSearchingSportsCardsPro || isFetchingSportsCardsProValue
                    }
                    onClick={() => void findSportsCardsProMarketValue()}
                  >
                    {isSearchingSportsCardsPro ? "Searching..." : "Find Market Value"}
                  </button>
                </div>

                {sportsCardsProStatus ? (
                  <p className={`market-status ${sportsCardsProStatus.type}`}>
                    {sportsCardsProStatus.text}
                  </p>
                ) : null}

                {sportsCardsProCandidates.length > 0 ? (
                  <div className="market-results">
                    {sportsCardsProCandidates.map((candidate) => (
                      <button
                        key={candidate.sportsCardsProId}
                        type="button"
                        disabled={isFetchingSportsCardsProValue}
                        onClick={() => void selectSportsCardsProCandidate(candidate)}
                      >
                        <strong>{candidate.productName}</strong>
                        <span>{candidate.setName || "SportsCardsPro product"}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {sportsCardsProValue?.estimatedValue ? (
                  <div className="market-value-detail">
                    <p>
                      Estimated Market Value{" "}
                      <strong>{formatCurrency(sportsCardsProValue.estimatedValue)}</strong>
                    </p>
                    <p>
                      Source:{" "}
                      <Link
                        href={sportsCardsProValue.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        SportsCardsPro
                      </Link>{" "}
                      · Last updated:{" "}
                      {new Date(sportsCardsProValue.fetchedAt).toLocaleDateString()}
                    </p>
                    <p>
                      Estimate only. Verify the exact card, parallel, condition,
                      and grade before pricing.
                    </p>
                    <button type="button" onClick={useSportsCardsProAskingPrice}>
                      Use as Asking Price
                    </button>
                  </div>
                ) : null}
              </div>
              <p>Grail tag is based on market value, not asking price.</p>
              <p>
                Offers are available on every GRAIL listing. Sellers can set a
                minimum offer.
              </p>
              {isCollectionMode ? (
                <p>
                  This card will appear in your public collection without Buy
                  Now. Buyers can still message you and make offers.
                </p>
              ) : null}
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
              <strong>{isCollectionMode ? "In Collection" : formatCurrency(askingPrice)}</strong>
              <ActionCircles showBuy={!isCollectionMode} />
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

            <section className="panel seller-trust-panel">
              <h2>Seller Protection</h2>
              <div className="seller-trust-grid">
                <span>Seller payout is queued after tracking, delivery, and inspection.</span>
                <span>Disputes pause payout until GRAIL review is complete.</span>
                <span>Real front and back card photos are required.</span>
                <span>Secure fulfillment helps protect seller rewards.</span>
              </div>
              <div className="seller-trust-links">
                <Link href="/seller-rules">Seller Rules</Link>
                <Link href="/fees">Fees</Link>
                <Link href="/shipping-policy">Shipping Policy</Link>
              </div>
            </section>

            <section className="panel action-panel">
              {!isEditMode ? (
                <button
                  type="button"
                  onClick={saveDraft}
                >
                  Save Draft
                </button>
              ) : null}
              <button
                type="button"
                onClick={previewListing}
              >
                Preview Listing
              </button>
              <button
                type="button"
                className="primary"
                disabled={!session || isCheckingAuth || isPublishing || isLoadingEditListing}
                onClick={isEditMode ? saveListingChanges : publishListing}
              >
                {isPublishing
                  ? isEditMode
                    ? "Saving..."
                    : isCollectionMode
                      ? "Adding..."
                      : "Publishing..."
                  : isEditMode
                    ? "Save Changes"
                  : isCollectionMode
                    ? "Add to Collection"
                    : "Publish Listing"}
              </button>
              <div className="listing-legal">
                <p>
                  Before listing, review seller rules, fees, shipping
                  expectations, and prohibited items.
                </p>
                <div>
                  {sellerPolicyLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
              {!session && !isCheckingAuth ? (
                <Link href="/login">Sign In to Publish</Link>
              ) : null}
              <Link href="/seller-dashboard">Back to Seller Dashboard</Link>
            </section>
          </aside>
        </section>
      </div>

      {isPreviewOpen ? (
        <div className="preview-modal-backdrop" role="presentation">
          <section
            className="panel preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Listing preview"
          >
            <div className="preview-modal-header">
              <div>
                <span>Preview Listing</span>
                <h2>{previewTitle}</h2>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setIsPreviewOpen(false)}
              >
                x
              </button>
            </div>

            <div className="preview-modal-body">
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

              <div className="preview-modal-copy">
                <div className="badge-row">
                  {badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
                <h3>{previewTitle}</h3>
                <p>{subtitle}</p>
                <div className="preview-detail-grid">
                  <span>{isCollectionMode ? "Status" : "Asking Price"} <strong>{isCollectionMode ? "In Collection" : formatCurrency(askingPrice)}</strong></span>
                  <span>Minimum Offer <strong>{minimumOffer ? formatCurrency(minimumOffer) : "Not set"}</strong></span>
                  <span>Card Type <strong>{cardType}</strong></span>
                  <span>
                    {cardType === "Graded" ? "Grade" : "Condition"}{" "}
                    <strong>{cardType === "Graded" ? `${grader} ${grade}` : condition}</strong>
                  </span>
                  {cardType === "Graded" && grader === "PSA" ? (
                    <span>
                      PSA Cert{" "}
                      <strong>
                        {psaVerification?.verified
                          ? `Verified ${psaVerification.certNumber}`
                          : certNumber || "Not verified"}
                      </strong>
                    </span>
                  ) : null}
                  <span>Seller <strong>{session?.user.email || "GRAIL Seller"}</strong></span>
                </div>
                <ActionCircles showBuy={!isCollectionMode} />
                <button type="button" className="view-card" disabled>
                  View Card Preview
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const pageStyles = `
  .list-page { min-height: 100vh; background: radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%), linear-gradient(180deg, #000 0%, #030304 58%, #000 100%); color: #fafafa; font-family: Arial, Helvetica, sans-serif; }
  .page-shell { width: min(1240px, calc(100vw - 32px)); margin: 0 auto; padding: 8px 0 38px; }
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
  .preview-modal-backdrop { position: fixed; inset: 0; z-index: 1200; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 22px; backdrop-filter: blur(12px); }
  .preview-modal { width: min(760px, 100%); padding: 18px; box-sizing: border-box; }
  .preview-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
  .preview-modal-header span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .preview-modal-header h2 { margin: 6px 0 0; color: #fff; font-size: 24px; line-height: 29px; font-weight: 900; }
  .preview-modal-header button { width: 34px; height: 34px; border-radius: 999px; padding: 0; }
  .preview-modal-body { margin-top: 16px; display: grid; grid-template-columns: 230px 1fr; gap: 18px; align-items: start; }
  .preview-modal-copy h3 { margin: 13px 0 0; color: #fff; font-size: 24px; line-height: 29px; font-weight: 900; }
  .preview-modal-copy p { color: #a1a1aa; font-size: 13px; line-height: 18px; font-weight: 800; }
  .preview-detail-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .preview-detail-grid span { border: 1px solid #202026; border-radius: 10px; background: rgba(8,8,10,0.76); color: #85858f; padding: 10px; font-size: 11px; line-height: 15px; font-weight: 800; }
  .preview-detail-grid strong { display: block; margin-top: 5px; color: #fff; font-size: 13px; line-height: 17px; font-weight: 900; }
  .list-layout { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  .main-column, .preview-column { display: grid; gap: 14px; }
  .form-section, .preview-card, .action-panel, .seller-trust-panel { padding: 16px; }
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
  input:disabled { color: #85858f; cursor: not-allowed; }
  label small { color: #85858f; font-size: 11px; line-height: 15px; font-weight: 800; }
  .psa-verification-box { grid-column: 1 / -1; border: 1px solid rgba(201,205,211,0.16); border-radius: 10px; background: rgba(201,205,211,0.045); padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .psa-verification-box span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .psa-verification-box strong { display: block; margin-top: 5px; color: #fff; font-size: 14px; line-height: 18px; font-weight: 900; }
  .psa-verification-box p { margin: 5px 0 0; color: #a1a1aa; font-size: 12px; line-height: 17px; font-weight: 800; }
  .psa-verification-box .psa-status.success { color: #E7DED0; }
  .psa-verification-box .psa-status.error { color: #fca5a5; }
  .market-value-box { margin-top: 14px; border: 1px solid rgba(201,205,211,0.16); border-radius: 10px; background: rgba(201,205,211,0.045); padding: 12px; display: grid; gap: 12px; }
  .market-value-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .market-value-header span { color: #C9CDD3; font-size: 11px; line-height: 14px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
  .market-value-header strong { display: block; margin-top: 5px; color: #fff; font-size: 18px; line-height: 22px; font-weight: 900; }
  .market-status { margin: 0; color: #C9CDD3; font-size: 12px; line-height: 17px; font-weight: 800; }
  .market-status.success { color: #E7DED0; }
  .market-status.error { color: #fca5a5; }
  .market-results { display: grid; gap: 8px; }
  .market-results button { min-height: auto; padding: 10px; display: grid; justify-content: stretch; justify-items: start; text-align: left; }
  .market-results strong { color: #fff; font-size: 13px; line-height: 17px; font-weight: 900; }
  .market-results span { margin-top: 3px; color: #a1a1aa; font-size: 11px; line-height: 15px; font-weight: 800; }
  .market-value-detail { border-top: 1px solid rgba(201,205,211,0.12); padding-top: 12px; display: grid; gap: 8px; }
  .market-value-detail p { margin: 0; color: #a1a1aa; font-size: 12px; line-height: 17px; font-weight: 800; }
  .market-value-detail strong { color: #fff; font-size: 15px; font-weight: 900; }
  .market-value-detail a { color: #E7DED0; font-weight: 900; text-decoration: none; }
  .market-value-detail a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .market-value-detail button { justify-self: start; }
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
  .listing-legal { border: 1px solid rgba(201,205,211,0.16); border-radius: 10px; background: rgba(201,205,211,0.045); padding: 12px; display: grid; gap: 10px; }
  .listing-legal p { margin: 0; color: #a1a1aa; font-size: 11px; line-height: 16px; font-weight: 800; }
  .listing-legal div { display: flex; flex-wrap: wrap; gap: 8px; }
  .listing-legal a { min-height: 30px; padding: 0 9px; border-radius: 8px; color: #E7DED0; font-size: 11px; }
  .seller-trust-grid { margin-top: 12px; display: grid; gap: 8px; }
  .seller-trust-grid span { border: 1px solid rgba(201,205,211,0.14); border-radius: 10px; background: rgba(201,205,211,0.04); color: #C9CDD3; padding: 10px; font-size: 11px; line-height: 16px; font-weight: 800; }
  .seller-trust-links { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
  .seller-trust-links a { min-height: 30px; border: 1px solid rgba(231,222,208,0.22); border-radius: 8px; background: rgba(231,222,208,0.055); color: #E7DED0; padding: 0 9px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-size: 11px; font-weight: 900; }
  @media (max-width: 1100px) { .page-shell { width: min(1240px, calc(100vw - 32px)); } .list-layout, .field-grid, .field-grid.three, .upload-grid, .preview-modal-body, .preview-detail-grid { grid-template-columns: 1fr; } .auth-notice, .publish-success, .psa-verification-box, .market-value-header { align-items: flex-start; flex-direction: column; } }
`;
