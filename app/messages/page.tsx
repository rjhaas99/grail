"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import Header from "../components/Header";
import RequireAuth from "../components/RequireAuth";
import { supabase } from "../../lib/supabase";

type Conversation = {
  id: string;
  listing_id: string | null;
  order_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  card_title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ChatMessage = {
  id: string;
  conversation_id: string | null;
  sender_id: string | null;
  body: string | null;
  created_at: string | null;
};

type ListingLookup = {
  id: string;
  seller_id: string | null;
  title: string | null;
};

type OrderLookup = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  status: string | null;
  listings: {
    id: string;
    title: string | null;
  } | null;
};

export default function MessagesPage() {
  const [currentUserId, setCurrentUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pageMessage, setPageMessage] = useState("");

  useEffect(() => {
    loadMessagesPage();
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadConversationMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  async function loadMessagesPage() {
    setLoading(true);
    setPageMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const params = new URLSearchParams(window.location.search);
    const listingId = params.get("listingId");
    const orderId = params.get("orderId");

    let selectedId = "";

    if (listingId) {
      selectedId = await getOrCreateListingConversation(user.id, listingId);
    }

    if (orderId) {
      selectedId = await getOrCreateOrderConversation(user.id, orderId);
    }

    await loadConversations(selectedId);
    setLoading(false);
  }

  async function getOrCreateListingConversation(userId: string, listingId: string) {
    const { data, error } = await supabase
      .from("listings")
      .select("id, seller_id, title")
      .eq("id", listingId)
      .maybeSingle();

    if (error) {
      setPageMessage(error.message);
      return "";
    }

    if (!data) {
      setPageMessage("Listing was not found.");
      return "";
    }

    const listing = data as ListingLookup;

    if (!listing.seller_id) {
      setPageMessage("Seller was not found for this listing.");
      return "";
    }

    if (listing.seller_id === userId) {
      setPageMessage("You cannot start a message thread with yourself.");
      return "";
    }

    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("listing_id", listing.id)
      .eq("buyer_id", userId)
      .eq("seller_id", listing.seller_id)
      .maybeSingle();

    if (existing) {
      return (existing as Conversation).id;
    }

    const { data: created, error: createError } = await supabase
      .from("chat_conversations")
      .insert({
        listing_id: listing.id,
        order_id: null,
        buyer_id: userId,
        seller_id: listing.seller_id,
        card_title: listing.title || "Card conversation",
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createError) {
      setPageMessage(createError.message);
      return "";
    }

    return (created as Conversation).id;
  }

  async function getOrCreateOrderConversation(userId: string, orderId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        listing_id,
        buyer_id,
        seller_id,
        status,
        listings (
          id,
          title
        )
      `
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      setPageMessage(error.message);
      return "";
    }

    if (!data) {
      setPageMessage("Order was not found.");
      return "";
    }

    const order = data as unknown as OrderLookup;

    if (!order.buyer_id || !order.seller_id) {
      setPageMessage("Buyer or seller was not found for this order.");
      return "";
    }

    if (order.buyer_id !== userId && order.seller_id !== userId) {
      setPageMessage("You do not have access to this order conversation.");
      return "";
    }

    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("order_id", order.id)
      .eq("buyer_id", order.buyer_id)
      .eq("seller_id", order.seller_id)
      .maybeSingle();

    if (existing) {
      return (existing as Conversation).id;
    }

    const { data: created, error: createError } = await supabase
      .from("chat_conversations")
      .insert({
        listing_id: order.listing_id,
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        card_title: order.listings?.title || "Order conversation",
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createError) {
      setPageMessage(createError.message);
      return "";
    }

    return (created as Conversation).id;
  }

  async function loadConversations(preferredConversationId = "") {
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setPageMessage(error.message);
      setConversations([]);
      return;
    }

    const rows = (data || []) as Conversation[];
    setConversations(rows);

    if (preferredConversationId) {
      setSelectedConversationId(preferredConversationId);
      return;
    }

    if (!selectedConversationId && rows.length > 0) {
      setSelectedConversationId(rows[0].id);
    }
  }

  async function loadConversationMessages(conversationId: string) {
    setLoadingMessages(true);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      setPageMessage(error.message);
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setMessages((data || []) as ChatMessage[]);
    setLoadingMessages(false);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanMessage = messageText.trim();

    if (!cleanMessage) return;

    if (!selectedConversationId) {
      setPageMessage("Select a conversation first.");
      return;
    }

    setPageMessage("");

    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: selectedConversationId,
      sender_id: currentUserId,
      body: cleanMessage,
    });

    if (error) {
      setPageMessage(error.message);
      return;
    }

    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedConversationId);

    setMessageText("");
    await loadConversationMessages(selectedConversationId);
    await loadConversations(selectedConversationId);
  }

  function formatDate(date: string | null) {
    if (!date) return "Recently";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(date: string | null) {
    if (!date) return "";

    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getOtherUserLabel(conversation: Conversation) {
    if (conversation.buyer_id === currentUserId) return "Seller";
    if (conversation.seller_id === currentUserId) return "Buyer";
    return "User";
  }

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId
  );

  return (
    <RequireAuth>
      <main className="min-h-screen bg-black text-white">
        <Header />

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                Messages
              </p>

              <h1 className="mt-4 text-5xl font-semibold tracking-tight">
                Conversations
              </h1>

              <p className="mt-4 max-w-2xl text-zinc-400">
                Message buyers and sellers about listings, orders, shipping, and offers.
              </p>
            </div>

            <Link
              href="/browse"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Browse Cards
            </Link>
          </div>

          {pageMessage && (
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              {pageMessage}
            </div>
          )}

          {loading ? (
            <div className="mt-12 rounded-3xl border border-zinc-900 bg-zinc-950 p-6">
              <p className="text-zinc-400">Loading messages...</p>
            </div>
          ) : (
            <div className="mt-12 grid min-h-[620px] gap-6 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-4">
                <div className="flex items-center justify-between px-2 py-3">
                  <h2 className="text-xl font-semibold">Inbox</h2>

                  <p className="text-sm text-zinc-500">
                    {conversations.length} total
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {conversations.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-900 bg-black p-5">
                      <p className="text-sm text-zinc-500">
                        No conversations yet. Open a card and click Message Seller.
                      </p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedConversationId(conversation.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selectedConversationId === conversation.id
                            ? "border-white bg-white text-black"
                            : "border-zinc-900 bg-black text-white hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {conversation.card_title || "Card conversation"}
                            </p>

                            <p
                              className={`mt-1 text-sm ${
                                selectedConversationId === conversation.id
                                  ? "text-zinc-700"
                                  : "text-zinc-500"
                              }`}
                            >
                              {getOtherUserLabel(conversation)}
                            </p>
                          </div>

                          <p
                            className={`text-xs ${
                              selectedConversationId === conversation.id
                                ? "text-zinc-700"
                                : "text-zinc-600"
                            }`}
                          >
                            {formatDate(conversation.updated_at)}
                          </p>
                        </div>

                        {conversation.order_id && (
                          <p
                            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs ${
                              selectedConversationId === conversation.id
                                ? "bg-black text-white"
                                : "bg-zinc-950 text-zinc-400"
                            }`}
                          >
                            Order chat
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex rounded-3xl border border-zinc-900 bg-zinc-950">
                {!selectedConversation ? (
                  <div className="flex flex-1 items-center justify-center p-8 text-center">
                    <div>
                      <h2 className="text-2xl font-semibold">
                        No conversation selected
                      </h2>

                      <p className="mt-3 text-zinc-500">
                        Choose a conversation or start one from a card page.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col">
                    <div className="border-b border-zinc-900 p-6">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                          <h2 className="text-2xl font-semibold">
                            {selectedConversation.card_title || "Card conversation"}
                          </h2>

                          <p className="mt-1 text-sm text-zinc-500">
                            Messaging {getOtherUserLabel(selectedConversation)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {selectedConversation.listing_id && (
                            <Link
                              href={`/cards/${selectedConversation.listing_id}`}
                              className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                            >
                              View Card
                            </Link>
                          )}

                          {selectedConversation.order_id && (
                            <Link
                              href="/orders"
                              className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
                            >
                              View Orders
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                      {loadingMessages ? (
                        <p className="text-zinc-500">Loading conversation...</p>
                      ) : messages.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-900 bg-black p-6 text-center">
                          <h3 className="text-xl font-semibold">
                            Start the conversation
                          </h3>

                          <p className="mt-3 text-sm text-zinc-500">
                            Send the first message about this card or order.
                          </p>
                        </div>
                      ) : (
                        messages.map((chatMessage) => {
                          const isMine = chatMessage.sender_id === currentUserId;

                          return (
                            <div
                              key={chatMessage.id}
                              className={`flex ${
                                isMine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[75%] rounded-3xl px-5 py-4 ${
                                  isMine
                                    ? "bg-white text-black"
                                    : "bg-black text-white"
                                }`}
                              >
                                <p className="text-sm leading-6">
                                  {chatMessage.body}
                                </p>

                                <p
                                  className={`mt-2 text-xs ${
                                    isMine ? "text-zinc-600" : "text-zinc-500"
                                  }`}
                                >
                                  {formatTime(chatMessage.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form
                      onSubmit={sendMessage}
                      className="border-t border-zinc-900 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row">
                        <input
                          value={messageText}
                          onChange={(event) => setMessageText(event.target.value)}
                          className="flex-1 rounded-full border border-zinc-800 bg-black px-5 py-4 outline-none placeholder:text-zinc-600"
                          placeholder="Type a message..."
                        />

                        <button
                          type="submit"
                          className="rounded-full bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200"
                        >
                          Send
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </RequireAuth>
  );
}