"use client";

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
};

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
      .select("id,seller_id,title,sport,player,year,brand,card_number,card_type,grader,grade,cert_number,condition,quantity,price,status")
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
    setCardType(listingData.card_type || "raw");
    setGrader(listingData.grader || "");
    setGrade(listingData.grade || "");
    setCertNumber(listingData.cert_number || "");
    setCondition(listingData.condition || "");
    setQuantity(String(listingData.quantity || 1));
    setPrice(listingData.price ? String(listingData.price) : "");
    setStatus(listingData.status || "active");

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

  async function saveListing() {
    setSaving(true);
    setMessage("");

    const priceNumber = Number(price);
    const quantityNumber = Number(quantity);

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
      "Remove this listing? It will disappear from Browse, but history will stay saved."
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
              {message && (
                <div className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
                  {message}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-zinc-400">Sport</label>
                  <input
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="Basketball"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Player</label>
                  <input
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="Michael Jordan"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Year</label>
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="1986"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Brand / Set</label>
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="Fleer"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Card Number</label>
                  <input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="57"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Type</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
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
                        onChange={(e) => setGrader(e.target.value)}
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
                        onChange={(e) => setGrade(e.target.value)}
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
                        onChange={(e) => setCertNumber(e.target.value)}
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
                      onChange={(e) => setCondition(e.target.value)}
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
                    onChange={(e) => setQuantity(e.target.value)}
                    type="number"
                    min="1"
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Price</label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="number"
                    min="1"
                    step="0.01"
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="250"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm text-zinc-400">Listing Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none focus:border-zinc-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
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
