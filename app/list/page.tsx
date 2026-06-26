"use client";

import { useState } from "react";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

export default function ListCardPage() {
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
  const [price, setPrice] = useState("");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  const titlePreview =
    cardType === "graded"
      ? `${year} ${brand} ${player} ${grader} ${grade}`.trim()
      : `${year} ${brand} ${player} ${condition}`.trim();

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
            Upload real photos, add card details, set your price, and prepare your listing.
          </p>

          <form className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-2xl font-semibold">Card Photos</h2>

              <div className="mt-6 grid gap-4">
                <label className="flex h-64 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-zinc-700 bg-black text-center hover:border-zinc-500">
                  {frontImage ? (
                    <img
                      src={frontImage}
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFrontImage(URL.createObjectURL(file));
                    }}
                  />
                </label>

                <label className="flex h-64 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-zinc-700 bg-black text-center hover:border-zinc-500">
                  {backImage ? (
                    <img
                      src={backImage}
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setBackImage(URL.createObjectURL(file));
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
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                >
                  <option value="graded">Graded Card</option>
                  <option value="raw">Raw Card</option>
                </select>

                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
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
                  onChange={(e) => setPlayer(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Player name"
                />

                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Year"
                />

                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Brand / set"
                />

                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Card number"
                />

                {cardType === "raw" && (
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
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
                      onChange={(e) => setGrader(e.target.value)}
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
                      onChange={(e) => setGrade(e.target.value)}
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
                      onChange={(e) => setCertNumber(e.target.value)}
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
                  defaultValue="1"
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Quantity"
                />

                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black p-4 outline-none"
                  placeholder="Asking price"
                />

                <p className="pt-2 text-sm text-zinc-500">
                  Seller Fee: 10% of final sale price. Buyer Fee: 3% added at checkout.
                </p>

                <button
                  type="button"
                  className="w-full rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200"
                >
                  Submit Listing
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>
    </RequireAuth>
  );
}