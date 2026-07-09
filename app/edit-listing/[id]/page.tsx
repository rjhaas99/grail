"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../components/Header";
import RequireAuth from "../../components/RequireAuth";
import { supabase } from "../../../lib/supabase";

type Listing = {
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
  quantity: number | null;
  price: number | null;
  status: string | null;
  estimated_value?: number | null;
  sportscardspro_id?: string | null;
  sportscardspro_product_name?: string | null;
  sportscardspro_set_name?: string | null;
  sportscardspro_estimated_value?: number | null;
  sportscardspro_price_field?: string | null;
  sportscardspro_source_url?: string | null;
  sportscardspro_fetched_at?: string | null;
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

function formatCurrency(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = String(params.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);

  const [sport, setSport] = useState("");
  const [player, setPlayer] = useState("");
  const [year, setYear] = useState("");
  const [brand, setBrand] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardType, setCardType] = useState("raw");
  const [grader, setGrader] = useState("");
  const [grade, setGrade] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [condition, setCondition] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("active");
  const [marketValue, setMarketValue] = useState("");
  const [sportsCardsProCandidates, setSportsCardsProCandidates] = useState<
    SportsCardsProCandidate[]
  >([]);
  const [sportsCardsProValue, setSportsCardsProValue] =
    useState<SportsCardsProValue | null>(null);
  const [sportsCardsProMessage, setSportsCardsProMessage] = useState("");
  const [loadingSportsCardsPro, setLoadingSportsCardsPro] = useState(false);

  const loadListing = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirectTo=/edit-listing/${listingId}`);
      return;
    }

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
          quantity,
          price,
          status,
          estimated_value,
          sportscardspro_id,
          sportscardspro_product_name,
          sportscardspro_set_name,
          sportscardspro_estimated_value,
          sportscardspro_price_field,
          sportscardspro_source_url,
          sportscardspro_fetched_at
        `,
      )
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage("Listing not found.");
      setLoading(false);
      return;
    }

    const listingData = data as Listing;

    if (listingData.seller_id !== user.id) {
      setMessage("You can only edit your own listings.");
      setLoading(false);
      return;
    }

    setListing(listingData);
    setSport(listingData.sport || "");
    setPlayer(listingData.player || "");
    setYear(listingData.year || "");
    setBrand(listingData.brand || "");
    setCardNumber(listingData.card_number || "");
    setCardType(listingData.card_type?.toLowerCase() || "raw");
    setGrader(listingData.grader || "");
    setGrade(listingData.grade || "");
    setCertNumber(listingData.cert_number || "");
    setCondition(listingData.condition || "");
    setQuantity(String(listingData.quantity || 1));
    setPrice(listingData.price ? String(listingData.price) : "");
    setStatus(listingData.status || "active");
    setMarketValue(
      listingData.sportscardspro_estimated_value
        ? String(listingData.sportscardspro_estimated_value)
        : listingData.estimated_value
          ? String(listingData.estimated_value)
          : "",
    );
    setSportsCardsProValue(
      listingData.sportscardspro_id && listingData.sportscardspro_estimated_value
        ? {
            sportsCardsProId: listingData.sportscardspro_id,
            productName:
              listingData.sportscardspro_product_name || listingData.title || "",
            setName: listingData.sportscardspro_set_name || "",
            estimatedValue: listingData.sportscardspro_estimated_value,
            priceFieldUsed: listingData.sportscardspro_price_field || "",
            sourceUrl:
              listingData.sportscardspro_source_url ||
              "https://www.sportscardspro.com",
            fetchedAt:
              listingData.sportscardspro_fetched_at || new Date().toISOString(),
          }
        : null,
    );
    setSportsCardsProMessage(
      listingData.sportscardspro_id
        ? "Saved SportsCardsPro estimate loaded."
        : "",
    );

    setLoading(false);
  }, [listingId, router]);

  useEffect(() => {
    if (listingId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadListing();
    }
  }, [listingId, loadListing]);

  function clean(value: string) {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  function buildTitle() {
    if (cardType === "graded") {
      return [year, brand, player, grader, grade].filter(Boolean).join(" ");
    }

    return [year, brand, player, condition].filter(Boolean).join(" ");
  }

  async function getAuthenticatedHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return null;
    }

    return {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    };
  }

  async function findSportsCardsProMarketValue() {
    setSportsCardsProCandidates([]);
    setSportsCardsProValue(null);
    setSportsCardsProMessage("");

    const headers = await getAuthenticatedHeaders();

    if (!headers) {
      setSportsCardsProMessage("Sign in to find SportsCardsPro market values.");
      return;
    }

    setLoadingSportsCardsPro(true);
    setSportsCardsProMessage("Searching SportsCardsPro...");

    try {
      const response = await fetch("/api/sportscardspro/search", {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: sport,
          year,
          brand,
          player,
          cardNumber,
          cardType,
          grader,
          grade,
        }),
      });
      const payload = (await response.json()) as SportsCardsProSearchResponse;

      if (!response.ok) {
        throw new Error(payload.error || "SportsCardsPro search failed.");
      }

      if (payload.error) {
        setSportsCardsProMessage(payload.error);
        return;
      }

      const candidates = payload.candidates || [];
      setSportsCardsProCandidates(candidates);
      setSportsCardsProMessage(
        candidates.length
          ? "Select the matching SportsCardsPro card."
          : "No SportsCardsPro matches found.",
      );
    } catch (error) {
      console.error("SportsCardsPro edit search error:", error);
      setSportsCardsProMessage(
        error instanceof Error
          ? error.message
          : "SportsCardsPro search is unavailable right now.",
      );
    } finally {
      setLoadingSportsCardsPro(false);
    }
  }

  async function selectSportsCardsProCandidate(candidate: SportsCardsProCandidate) {
    const headers = await getAuthenticatedHeaders();

    if (!headers) {
      setSportsCardsProMessage("Sign in to retrieve SportsCardsPro market values.");
      return;
    }

    setLoadingSportsCardsPro(true);
    setSportsCardsProMessage("Retrieving SportsCardsPro value...");

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
        setSportsCardsProMessage(
          payload.error || "SportsCardsPro has no value for this grade.",
        );
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
      setSportsCardsProMessage("SportsCardsPro estimate selected.");
    } catch (error) {
      console.error("SportsCardsPro edit value error:", error);
      setSportsCardsProMessage(
        error instanceof Error
          ? error.message
          : "SportsCardsPro value is unavailable right now.",
      );
    } finally {
      setLoadingSportsCardsPro(false);
    }
  }

  function useSportsCardsProAskingPrice() {
    if (sportsCardsProValue?.estimatedValue) {
      setPrice(String(sportsCardsProValue.estimatedValue));
      setMessage("SportsCardsPro estimate copied to price.");
    }
  }

  async function saveListing() {
    setSaving(true);
    setMessage("");

    const priceNumber = Number(price);
    const quantityNumber = Number(quantity);
    const estimatedValue = Number(marketValue);

    if (!player.trim()) {
      setMessage("Player name is required.");
      setSaving(false);
      return;
    }

    if (!price || Number.isNaN(priceNumber) || priceNumber <= 0) {
      setMessage("Enter a valid price.");
      setSaving(false);
      return;
    }

    const title = buildTitle() || player.trim();

    const { error } = await supabase
      .from("listings")
      .update({
        title,
        sport: clean(sport),
        player: clean(player),
        year: clean(year),
        brand: clean(brand),
        card_number: clean(cardNumber),
        card_type: cardType,
        grader: cardType === "graded" ? clean(grader) : null,
        grade: cardType === "graded" ? clean(grade) : null,
        cert_number: cardType === "graded" ? clean(certNumber) : null,
        condition: cardType === "raw" ? clean(condition) : null,
        quantity:
          !Number.isNaN(quantityNumber) && quantityNumber > 0
            ? quantityNumber
            : 1,
        price: priceNumber,
        status,
        estimated_value:
          Number.isFinite(estimatedValue) && estimatedValue > 0
            ? estimatedValue
            : sportsCardsProValue?.estimatedValue || null,
        sportscardspro_id: sportsCardsProValue?.sportsCardsProId || null,
        sportscardspro_product_name: sportsCardsProValue?.productName || null,
        sportscardspro_set_name: sportsCardsProValue?.setName || null,
        sportscardspro_estimated_value:
          sportsCardsProValue?.estimatedValue || null,
        sportscardspro_price_field: sportsCardsProValue?.priceFieldUsed || null,
        sportscardspro_source_url: sportsCardsProValue?.sourceUrl || null,
        sportscardspro_fetched_at: sportsCardsProValue?.fetchedAt || null,
      })
      .eq("id", listingId);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(status === "active" ? `/cards/${listingId}` : "/dashboard");
  }

  async function removeListing() {
    const confirmed = window.confirm(
      "Remove this listing? It will disappear from Browse, but history will stay saved.",
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("listings")
      .update({ status: "removed" })
      .eq("id", listingId);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
              Seller Tools
            </p>

            <h1 className="mt-4 text-5xl font-semibold tracking-tight">
              Edit Listing
            </h1>

            <p className="mt-3 text-zinc-400">
              Update card details, price, status, or remove the listing.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
              <p className="text-zinc-400">Loading listing...</p>
            </div>
          ) : !listing ? (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-8">
              <h2 className="text-2xl font-semibold">Listing unavailable</h2>
              <p className="mt-3 text-zinc-500">{message}</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              {message ? (
                <div className="mb-6 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
                  {message}
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-zinc-400">Sport</label>
                  <input
                    value={sport}
                    onChange={(event) => setSport(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="Basketball"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Player</label>
                  <input
                    value={player}
                    onChange={(event) => setPlayer(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="Michael Jordan"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Year</label>
                  <input
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="1986"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Brand / Set</label>
                  <input
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="Fleer"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Card Number</label>
                  <input
                    value={cardNumber}
                    onChange={(event) => setCardNumber(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="57"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Type</label>
                  <select
                    value={cardType}
                    onChange={(event) => setCardType(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                  >
                    <option value="raw">Raw</option>
                    <option value="graded">Graded</option>
                  </select>
                </div>

                {cardType === "graded" ? (
                  <>
                    <div>
                      <label className="text-sm text-zinc-400">Grader</label>
                      <select
                        value={grader}
                        onChange={(event) => setGrader(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                      >
                        <option value="">Select grader</option>
                        <option value="PSA">PSA</option>
                        <option value="BGS">BGS</option>
                        <option value="SGC">SGC</option>
                        <option value="CGC">CGC</option>
                        <option value="TAG">TAG</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-zinc-400">Grade</label>
                      <input
                        value={grade}
                        onChange={(event) => setGrade(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                        placeholder="10"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm text-zinc-400">
                        Cert Number
                      </label>
                      <input
                        value={certNumber}
                        onChange={(event) => setCertNumber(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                        placeholder="Optional"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <label className="text-sm text-zinc-400">Condition</label>
                    <select
                      value={condition}
                      onChange={(event) => setCondition(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    >
                      <option value="">Select condition</option>
                      <option value="Mint">Mint</option>
                      <option value="Near Mint">Near Mint</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-sm text-zinc-400">Quantity</label>
                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    type="number"
                    min="1"
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Price</label>
                  <input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    type="number"
                    min="1"
                    step="0.01"
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="250"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">
                    Estimated Market Value
                  </label>
                  <input
                    value={marketValue}
                    onChange={(event) => setMarketValue(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Listing Status</label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-900 bg-black p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9CDD3]">
                      SportsCardsPro Market Value
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {sportsCardsProValue?.estimatedValue
                        ? formatCurrency(sportsCardsProValue.estimatedValue)
                        : "No estimate selected"}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Estimate only. Verify the exact card, parallel, condition,
                      and grade before pricing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={findSportsCardsProMarketValue}
                    disabled={loadingSportsCardsPro}
                    className="rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingSportsCardsPro ? "Working..." : "Find Market Value"}
                  </button>
                </div>

                {sportsCardsProMessage ? (
                  <p className="mt-4 text-sm text-zinc-400">
                    {sportsCardsProMessage}
                  </p>
                ) : null}

                {sportsCardsProCandidates.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {sportsCardsProCandidates.map((candidate) => (
                      <button
                        key={candidate.sportsCardsProId}
                        type="button"
                        onClick={() => void selectSportsCardsProCandidate(candidate)}
                        disabled={loadingSportsCardsPro}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="block font-semibold text-white">
                          {candidate.productName}
                        </span>
                        <span className="mt-1 block text-sm text-zinc-500">
                          {candidate.setName || "SportsCardsPro product"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {sportsCardsProValue?.estimatedValue ? (
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-400">
                      Source:{" "}
                      <Link
                        className="font-semibold text-[#E7DED0]"
                        href={sportsCardsProValue.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        SportsCardsPro
                      </Link>{" "}
                      · Last updated:{" "}
                      {new Date(sportsCardsProValue.fetchedAt).toLocaleDateString()}
                    </p>
                    <button
                      type="button"
                      onClick={useSportsCardsProAskingPrice}
                      className="mt-4 rounded-full bg-[#E7DED0] px-5 py-3 text-sm font-semibold text-black hover:bg-white"
                    >
                      Use as Asking Price
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-900 bg-black p-5">
                <p className="text-sm text-zinc-500">Preview Title</p>
                <p className="mt-2 text-xl font-semibold">
                  {buildTitle() || "Card title will appear here"}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={saveListing}
                  disabled={saving}
                  className="rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/cards/${listingId}`)}
                  className="rounded-full border border-zinc-800 px-8 py-4 font-semibold text-zinc-300 hover:border-zinc-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={removeListing}
                  disabled={saving}
                  className="rounded-full border border-red-900/70 px-8 py-4 font-semibold text-red-300 hover:border-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete Listing
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}

