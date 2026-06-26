"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";

const conversations = [
  {
    id: "jordan",
    title: "Jordan Rookie Offer",
    subtitle: "Michael Jordan Rookie • PSA 9",
    cardLink: "/cards/jordan-rookie",
    preview: "Buyer: Would you take $4,200?",
    messages: [
      { from: "Buyer", text: "Would you take $4,200?" },
      { from: "You", text: "I could do $4,350." },
      { from: "Buyer", text: "Meet at $4,300?" },
    ],
  },
  {
    id: "brady",
    title: "Tom Brady Auto",
    subtitle: "Tom Brady Auto • BGS 9.5",
    cardLink: "/cards/tom-brady-auto",
    preview: "Buyer: Can you send more photos?",
    messages: [
      { from: "Buyer", text: "Can you send more photos?" },
      { from: "You", text: "Yes, I can upload more photos tonight." },
    ],
  },
  {
    id: "lebron",
    title: "LeBron Rookie",
    subtitle: "LeBron James Rookie • PSA 10",
    cardLink: "/cards/lebron-rookie",
    preview: "Seller: I can do $7,950.",
    messages: [
      { from: "Seller", text: "I can do $7,950." },
      { from: "You", text: "Can you meet at $7,800?" },
    ],
  },
];

export default function MessagesPage() {
  const [activeId, setActiveId] = useState("jordan");
  const active = conversations.find((item) => item.id === activeId)!;

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-7xl px-8 py-12">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Messages
          </p>

          <h1 className="mt-4 text-5xl font-semibold">Inbox</h1>

          <p className="mt-4 text-zinc-400">
            Manage buyer questions, seller updates, and offer conversations.
          </p>

          <div className="mt-12 flex items-start gap-6">
            <div className="w-[360px] rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
              <h2 className="px-2 pb-4 text-xl font-semibold">
                Conversations
              </h2>

              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveId(conversation.id)}
                    className={`w-full rounded-2xl px-4 py-4 text-left transition ${
                      activeId === conversation.id
                        ? "bg-zinc-900"
                        : "hover:bg-zinc-900"
                    }`}
                  >
                    <p className="text-base font-semibold">
                      {conversation.title}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {conversation.preview}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-[560px] flex-1 flex-col rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <div className="border-b border-zinc-900 pb-5">
                <Link
                  href={active.cardLink}
                  className="text-2xl font-semibold hover:underline"
                >
                  {active.title}
                </Link>

                <p className="mt-1 text-sm text-zinc-500">
                  {active.subtitle}
                </p>
              </div>

              <div className="flex-1 space-y-4 py-6">
                {active.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.from === "You" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[460px] rounded-2xl px-5 py-4 ${
                        message.from === "You"
                          ? "bg-white text-black"
                          : "bg-zinc-900 text-white"
                      }`}
                    >
                      <p
                        className={`text-xs ${
                          message.from === "You"
                            ? "text-zinc-500"
                            : "text-zinc-400"
                        }`}
                      >
                        {message.from}
                      </p>

                      <p className="mt-1 text-sm leading-6">
                        {message.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 border-t border-zinc-900 pt-5">
                <input
                  className="h-12 flex-1 rounded-full border border-zinc-800 bg-black px-5 text-sm text-white outline-none"
                  placeholder="Write a message..."
                />

                <button className="h-12 rounded-full bg-white px-7 text-sm font-semibold text-black hover:bg-zinc-200">
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </RequireAuth>
  );
}