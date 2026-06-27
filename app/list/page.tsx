"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../../lib/supabase";

export default function ListCardPage() {
  const router = useRouter();

  const [cardType, setCardType] = useState("graded");
  const [sport, setSport] = useState("");
  const [player, setPlayer] = useState("");
  const [year, setYear] = useState("");
  const [brand, setBrand] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [grader, setGrader] = useState("");
  const [grade, setGrade] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [condition, setCondition] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");

  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titlePreview =
    cardType === "graded"
      ? `${year} ${brand} ${player} ${grader} ${grade}`.trim()
      : `${year} ${brand} ${player} ${condition}`.trim();

  function cleanFileName(fileName: string) {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-");
  }

  async function uploadCardImage({
    file,
    userId,
    listingId,
    imageType,
  }: {
    file: File;
    userId: string;
    listingId: string;
    imageType: "front" | "back";
  }) {
    const path = `${userId}/${listingId}/${imageType}-${Date.now()}-${cleanFileName(
      file.name
    )}`;

    const { error: uploadError } = await supabase.storage
      .from("card-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("card-images")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!frontImageFile) {
      setMessage("Please upload a front image.");
      return;
    }

    if (!sport || !player || !year || !brand || !price) {
      setMessage("Please fill out sport, player, year, brand, and price.");
      return;
    }

    if (cardType === "graded" && (!grader || !grade)) {
      setMessage("Please select a grader and grade.");
      return;
    }

    if (cardType === "raw" && !condition) {
      setMessage("Please select the raw card condition.");
      return;
    }

    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);

    if (!numericPrice || numericPrice <= 0) {
      setMessage("Please enter a valid asking price.");
      return;
    }

    if (!numericQuantity || numericQuantity <= 0) {
      setMessage("Please enter a valid quantity.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("Creating listing...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirectTo=${encodeURIComponent("/list")}`);
        return;
      }

      const finalTitle =
        titlePreview ||
        `${year} ${brand} ${player}`.trim() ||
        "Untitled Card";

      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title: finalTitle,
          sport,
          player,
          year,
          brand,
          card_number: cardNumber || null,
          card_type: cardType,
          grader: cardType === "graded" ? grader : null,
          grade: cardType === "graded" ? grade : null,
          cert_number: cardType === "graded" ? certNumber || null : null,
          condition: cardType === "raw" ? condition : null,
          quantity: numericQuantity,
          price: numericPrice,
          status: "active",
        })
        .select("id")
        .single();

      if (listingError) throw listingError;

      const imageRows = [];

      const frontImageUrl = await uploadCardImage({
        file: frontImageFile,
        userId: user.id,
        listingId: listing.id,
        imageType: "front",
      });

      imageRows.push({
        listing_id: listing.id,
        image_url: frontImageUrl,
        image_type: "front",
      });

      if (backImageFile) {
        const backImageUrl = await uploadCardImage({
          file: backImageFile,
          userId: user.id,
          listingId: listing.id,
          imageType: "back",
        });

        imageRows.push({
          listing_id: listing.id,
          image_url: backImageUrl,
          image_type: "back",
        });
      }

      const { error: imageError } = await supabase
        .from("listing_images")
        .insert(imageRows);

      if (imageError) throw imageError;

      setMessage("Listing created successfully.");

      router.push("/portfolio");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Listing could not be created. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-5xl px-6 py-16">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.45em] text-zinc-500">
            Sell a Card
          </p>

          <h1 className="text-5xl font-semibold tracking-tight">
            List your card.
          </h1>

          <p className="mt-4 text-zinc-400">
            Upload real photos, add card details, set your price, and create a real listing.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 grid gap-6 lg:grid-cols-2"
          >
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-semibold">Card Photos</h2>

              <div className="mt-6 grid gap-4">
                <label className="flex h-64 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-zinc-700 bg-black text-center hover:border-zinc-500">
                  {frontImagePreview ? (
                    <img
                      src={frontImagePreview}
                      alt="Front of card"
                      className="mx-auto max-h-[500px] w-auto object-contain"
                    />
                  ) : (
                    <div>
                      <p className="font-semibold">Upload Front Image</p>
                      <p className="mt-2 text-sm text-zinc-500">JPG, PNG, or HEIC</p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        setFrontImageFile(file);
                        setFrontImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>

                <label className="flex h-64 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-zinc-700 bg-black text-center hover:border-zinc-500">
                  {backImagePreview ? (
                    <img
                      src={backImagePreview}
                      alt="Back of card"
                      className="mx-auto max-h-[500px] w-auto object-contain"
                    />
                  ) : (
                    <div>
                      <p className="font-semibold">Upload Back Image</p>
                      <p className="mt-2 text-sm text-zinc-500">
                        Optional but recommended
                      </p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        setBackImageFile(file);
                        setBackImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              </div>

              <div className="mt-6 rounded-3xl border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-500">Listing Preview</p>

                <h3 className="mt-2 text-xl font-semibold">
                  {titlePreview || "Your card title will appear here"}
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  {price ? `$${price}` : "Asking price"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-semibold">Card Details</h2>

              <div className="mt-6 space-y-5">
                <select
                  value={cardType}
                  onChange={(event) => setCardType(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                >
                  <option value="graded">Graded Card</option>
                  <option value="raw">Raw Card</option>
                </select>

                <select
                  value={sport}
                  onChange={(event) => setSport(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                >
                  <option value="">Select sport/category</option>
                  <option>Basketball</option>
                  <option>Football</option>
                  <option>Baseball</option>
                  <option>Hockey</option>
                  <option>Soccer</option>
                  <option>Pokémon</option>
                  <option>TCG</option>
                  <option>Other</option>
                </select>

                <input
                  value={player}
                  onChange={(event) => setPlayer(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Player name"
                />

                <input
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Year"
                />

                <input
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Brand / set"
                />

                <input
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Card number"
                />

                {cardType === "raw" && (
                  <select
                    value={condition}
                    onChange={(event) => setCondition(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  >
                    <option value="">Raw condition</option>
                    <option>Mint</option>
                    <option>Near Mint</option>
                    <option>Excellent</option>
                    <option>Very Good</option>
                    <option>Poor</option>
                  </select>
                )}

                {cardType === "graded" && (
                  <>
                    <select
                      value={grader}
                      onChange={(event) => setGrader(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                    >
                      <option value="">Select grader</option>
                      <option>PSA</option>
                      <option>BGS</option>
                      <option>SGC</option>
                      <option>CGC</option>
                      <option>TAG</option>
                      <option>Other</option>
                    </select>

                    <select
                      value={grade}
                      onChange={(event) => setGrade(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                    >
                      <option value="">Select grade</option>
                      <option>10</option>
                      <option>9.5</option>
                      <option>9</option>
                      <option>8.5</option>
                      <option>8</option>
                      <option>7.5</option>
                      <option>7</option>
                      <option>6</option>
                      <option>5</option>
                      <option>4</option>
                      <option>3</option>
                      <option>2</option>
                      <option>1</option>
                    </select>

                    <input
                      value={certNumber}
                      onChange={(event) => setCertNumber(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                      placeholder="Certification number (optional)"
                    />

                    <button
                      type="button"
                      className="w-full rounded-full border border-zinc-800 px-8 py-4 font-semibold text-white hover:border-zinc-600"
                    >
                      Verify Certification
                    </button>
                  </>
                )}

                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Quantity"
                />

                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Asking price"
                />

                <p className="pt-2 text-sm text-zinc-500">
                  Seller Fee: 10% of final sale price. Buyer Fee: 3% added at checkout.
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Creating Listing..." : "Submit Listing"}
                </button>

                {message && (
                  <p className="text-center text-sm text-zinc-400">
                    {message}
                  </p>
                )}
              </div>
            </div>
          </form>
        </section>
      </main>
    </RequireAuth>
  );
}