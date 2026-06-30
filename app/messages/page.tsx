"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Header from "../components/Header";
import {
  type MockConversation,
  mockConversations,
} from "../lib/mockData";

type Conversation = MockConversation & {
  source?: "mock" | "supabase";
  buyerId?: string | null;
  sellerId?: string | null;
  listingId?: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  listing_id: string | null;
  body: string | null;
  created_at: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  price: number | null;
  seller_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

const initialConversations: Conversation[] = mockConversations;
const mockConversationStorageKey = "grail-mock-conversations";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getProfileName(profile: ProfileRow | undefined) {
  return profile?.full_name || profile?.username || "GRAIL User";
}

function getSortRank(value: string | null) {
  if (!value) {
    return 0;
  }

  return new Date(value).getTime();
}

function getMessageGroupId(listingId: string | null, otherUserId: string | null) {
  return `${listingId || "no-listing"}:${otherUserId || "unknown-user"}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }

  return String(error);
}

function logMessageSupabaseError({
  step,
  listingId,
  sellerId,
  buyerId,
  payload,
  error,
}: {
  step: string;
  listingId?: string | null;
  sellerId?: string | null;
  buyerId?: string | null;
  payload?: unknown;
  error: unknown;
}) {
  console.error("GRAIL message Supabase error:", {
    step,
    listingId,
    sellerId,
    buyerId,
    payload,
    error,
    message: getErrorMessage(error),
  });
}

function readLocalMockConversations(): Conversation[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedConversations = window.localStorage.getItem(
      mockConversationStorageKey,
    );

    return storedConversations
      ? (JSON.parse(storedConversations) as Conversation[])
      : [];
  } catch (error) {
    console.error("Mock conversation read error:", error);
    return [];
  }
}

function getMockFallbackConversations() {
  const storedConversations = readLocalMockConversations();
  const storedIds = new Set(
    storedConversations.map((conversation) => conversation.id),
  );

  return [
    ...storedConversations,
    ...initialConversations.filter(
      (conversation) => !storedIds.has(conversation.id),
    ),
  ];
}

function CardArtwork({ accent }: { accent: string }) {
  return (
    <div className="card-art">
      <div
        className="card-face"
        style={{
          background: `radial-gradient(circle at 50% 22%, rgba(231,222,208,0.32), transparent 16%), linear-gradient(145deg, ${accent}, #111827 54%, #030304)`,
        }}
      >
        <span />
        <strong />
      </div>
    </div>
  );
}

function MessagesFallback() {
  return (
    <main className="messages-page">
      <style>{pageStyles}</style>
      <div className="messages-shell">
        <Header />
        <section className="page-heading">
          <span>Messages</span>
          <h1>Messages</h1>
          <p>Loading messages...</p>
        </section>
        <section className="messages-layout">
          <div className="conversation-list panel">
            <p className="empty-copy">Loading messages...</p>
          </div>
          <div className="thread-panel panel">
            <div className="empty-thread">
              <h2>Loading messages...</h2>
              <p>Preparing your conversations.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesFallback />}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const requestedListingId = searchParams.get("listing");
  const requestedSellerId = searchParams.get("seller");
  const requestedMockConversationId = searchParams.get("mockConversation");
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterFor, setCounterFor] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [usesRealMessages, setUsesRealMessages] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      setIsLoadingMessages(true);
      setStatusMessage("");

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      const userId = sessionData.session?.user.id || "";

      if (sessionError) {
        logMessageSupabaseError({
          step: "messages auth session",
          listingId: requestedListingId,
          sellerId: requestedSellerId,
          buyerId: null,
          error: sessionError,
        });

        if (isMounted) {
          const fallbackConversations = getMockFallbackConversations();

          setUsesRealMessages(false);
          setConversations(fallbackConversations);
          setActiveId(
            requestedMockConversationId ||
              fallbackConversations[0]?.id ||
              "",
          );
          setStatusMessage(
            "Demo messages shown because real messages are unavailable.",
          );
          setIsLoadingMessages(false);
        }

        return;
      }

      if (!isMounted) {
        return;
      }

      setCurrentUserId(userId);

      if (!userId) {
        setUsesRealMessages(true);
        setConversations([]);
        setActiveId("");
        setIsLoadingMessages(false);
        return;
      }

      try {
        const { data: messageData, error: messageError } = await supabase
          .from("messages")
          .select("id, sender_id, receiver_id, listing_id, body, created_at")
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: false });

        if (messageError) {
          logMessageSupabaseError({
            step: "messages direct messages select",
            listingId: requestedListingId,
            sellerId: requestedSellerId,
            buyerId: userId,
            error: messageError,
          });
          throw messageError;
        }

        const messageRows = (messageData || []) as MessageRow[];
        const requestedGroupId =
          requestedListingId && requestedSellerId
            ? getMessageGroupId(requestedListingId, requestedSellerId)
            : "";
        const listingIds = Array.from(
          new Set(
            [
              ...messageRows.map((message) => message.listing_id),
              requestedListingId,
            ].filter((listingId): listingId is string => Boolean(listingId)),
          ),
        );
        const participantIds = Array.from(
          new Set(
            [
              ...messageRows.flatMap((message) => [
                message.sender_id === userId
                  ? message.receiver_id
                  : message.sender_id,
              ]),
              requestedSellerId,
            ].filter((participantId): participantId is string =>
              Boolean(participantId),
            ),
          ),
        );

        let listingRows: ListingRow[] = [];
        let profileRows: ProfileRow[] = [];

        if (listingIds.length > 0) {
          const { data: listingData, error: listingError } = await supabase
            .from("listings")
            .select("id, title, price, seller_id")
            .in("id", listingIds);

          if (listingError) {
            logMessageSupabaseError({
              step: "messages related listings select",
              listingId: requestedListingId,
              sellerId: requestedSellerId,
              buyerId: userId,
              payload: { listingIds },
              error: listingError,
            });
            throw listingError;
          }

          listingRows = (listingData || []) as ListingRow[];
        }

        if (participantIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username")
            .in("id", participantIds);

          if (profileError) {
            logMessageSupabaseError({
              step: "messages participant profiles select",
              listingId: requestedListingId,
              sellerId: requestedSellerId,
              buyerId: userId,
              payload: { participantIds },
              error: profileError,
            });
            throw profileError;
          }

          profileRows = (profileData || []) as ProfileRow[];
        }

        const listingsById = new Map(
          listingRows.map((listing) => [listing.id, listing]),
        );
        const profilesById = new Map(
          profileRows.map((profile) => [profile.id, profile]),
        );
        const groupedMessages = new Map<
          string,
          { listingId: string | null; otherUserId: string | null; messages: MessageRow[] }
        >();

        messageRows.forEach((message) => {
          const otherUserId =
            message.sender_id === userId ? message.receiver_id : message.sender_id;
          const groupId = getMessageGroupId(message.listing_id, otherUserId);
          const existingGroup = groupedMessages.get(groupId);

          if (existingGroup) {
            existingGroup.messages.push(message);
          } else {
            groupedMessages.set(groupId, {
              listingId: message.listing_id,
              otherUserId,
              messages: [message],
            });
          }
        });

        if (requestedListingId && requestedSellerId && !groupedMessages.has(requestedGroupId)) {
          groupedMessages.set(requestedGroupId, {
            listingId: requestedListingId,
            otherUserId: requestedSellerId,
            messages: [],
          });
        }

        const mappedConversations = Array.from(groupedMessages.entries())
          .map(([groupId, group]) => {
            const sortedMessages = [...group.messages].sort(
              (first, second) =>
                getSortRank(first.created_at) - getSortRank(second.created_at),
            );
            const latestMessage = sortedMessages[sortedMessages.length - 1];
            const listing = group.listingId
              ? listingsById.get(group.listingId)
              : undefined;
            const otherProfile = group.otherUserId
              ? profilesById.get(group.otherUserId)
              : undefined;
            const participantName = getProfileName(otherProfile);
            const cardTitle = listing?.title || "GRAIL Listing";
            const cardHref = group.listingId ? `/cards/${group.listingId}` : "/browse";
            const latestTime = latestMessage?.created_at || null;
            const snippet = latestMessage?.body || "Conversation ready.";

            return {
              id: groupId,
              source: "supabase" as const,
              buyerId: userId,
              sellerId: group.otherUserId,
              listingId: group.listingId,
              participantName,
              participantRole: "Seller",
              person: participantName,
              badge: "Seller",
              cardId: group.listingId || groupId,
              cardTitle,
              cardRoute: cardHref,
              cardHref,
              price: Number(listing?.price || 0),
              snippet,
              lastSnippet: snippet,
              timestamp: latestMessage ? formatTimestamp(latestTime) : "Ready",
              sortRank: latestMessage ? getSortRank(latestTime) : Date.now(),
              unread: false,
              isActive: true,
              accent: "#334155",
              messages: sortedMessages.map((message) => ({
                id: message.id,
                sender: message.sender_id === userId ? "buyer" as const : "seller" as const,
                body: message.body || "",
                time: formatTimestamp(message.created_at),
              })),
            };
          })
          .sort((first, second) => second.sortRank - first.sortRank);

        const localMockConversations = readLocalMockConversations();
        const requestedMockConversation = requestedMockConversationId
          ? localMockConversations.find(
              (conversation) => conversation.id === requestedMockConversationId,
            )
          : undefined;
        const visibleConversations =
          mappedConversations.length > 0
            ? requestedMockConversation
              ? [...mappedConversations, requestedMockConversation]
              : mappedConversations
            : requestedMockConversation
              ? [requestedMockConversation]
              : getMockFallbackConversations();

        if (!isMounted) {
          return;
        }

        setUsesRealMessages(true);
        setConversations(visibleConversations);
        setActiveId(
          requestedMockConversation?.id ||
            (requestedGroupId &&
            visibleConversations.some(
              (conversation) => conversation.id === requestedGroupId,
            )
              ? requestedGroupId
              : "") ||
            visibleConversations[0]?.id ||
            "",
        );
        setIsLoadingMessages(false);
      } catch (error) {
        logMessageSupabaseError({
          step: "messages load direct messages catch",
          listingId: requestedListingId,
          sellerId: requestedSellerId,
          buyerId: userId,
          error,
        });
        console.warn(
          "Supabase messages table unavailable; using mock conversations.",
          error,
        );

        if (!isMounted) {
          return;
        }

        setUsesRealMessages(false);
        const fallbackConversations = getMockFallbackConversations();

        setConversations(fallbackConversations);
        setActiveId(
          requestedMockConversationId ||
            fallbackConversations[0]?.id ||
            "",
        );
        setStatusMessage(
          "Demo messages shown because real messages are unavailable.",
        );
        setIsLoadingMessages(false);
      }
    }

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [
    requestedListingId,
    requestedMockConversationId,
    requestedSellerId,
  ]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sortedConversations = [...conversations].sort((first, second) => {
      if (first.unread !== second.unread) {
        return first.unread ? -1 : 1;
      }

      return second.sortRank - first.sortRank;
    });

    if (!query) {
      return sortedConversations;
    }

    return sortedConversations.filter((conversation) =>
      [
        conversation.person,
        conversation.cardTitle,
        conversation.lastSnippet,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [conversations, searchQuery]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ||
    conversations[0] ||
    null;

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = draft.trim();

    if (!body || !activeConversation) {
      return;
    }

    if (usesRealMessages && activeConversation.source === "supabase") {
      if (!currentUserId) {
        setStatusMessage("Sign in to send messages.");
        return;
      }

      if (!activeConversation.sellerId || !activeConversation.listingId) {
        logMessageSupabaseError({
          step: "messages composer missing receiver or listing",
          listingId: activeConversation.listingId,
          sellerId: activeConversation.sellerId,
          buyerId: currentUserId,
          error: new Error("Missing receiver_id or listing_id for direct message."),
        });
        setStatusMessage("Message could not be sent. Check console for Supabase error.");
        return;
      }

      const messagePayload = {
        sender_id: currentUserId,
        receiver_id: activeConversation.sellerId,
        listing_id: activeConversation.listingId,
        body,
      };
      const { data, error } = await supabase
        .from("messages")
        .insert(messagePayload)
        .select("id, sender_id, receiver_id, listing_id, body, created_at")
        .single();

      if (error) {
        logMessageSupabaseError({
          step: "messages composer message insert",
          listingId: activeConversation.listingId,
          sellerId: activeConversation.sellerId,
          buyerId: currentUserId,
          payload: messagePayload,
          error,
        });
        setStatusMessage("Message could not be sent. Check console for Supabase error.");
        return;
      }

      const insertedMessage = data as MessageRow;

      setConversations((items) =>
        items.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                unread: false,
                lastSnippet: body,
                snippet: body,
                timestamp: "now",
                sortRank: Date.now(),
                messages: [
                  ...conversation.messages,
                  {
                    id: insertedMessage.id,
                    sender: "buyer",
                    body,
                    time: "Now",
                  },
                ],
              }
            : conversation,
        ),
      );
      setDraft("");
      setStatusMessage("");
      return;
    }

    setConversations((items) =>
      items.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              unread: false,
              lastSnippet: body,
              timestamp: "now",
              sortRank: Date.now(),
              messages: [
                ...conversation.messages,
                {
                  id: `local-${conversation.messages.length + 1}`,
                  sender: "buyer",
                  body,
                  time: "Now",
                },
              ],
            }
          : conversation,
      ),
    );
    setDraft("");
  }

  function updateOffer(status: "Accepted" | "Countered" | "Declined") {
    if (!activeConversation) {
      return;
    }

    setConversations((items) =>
      items.map((conversation) =>
        conversation.id === activeConversation.id && conversation.offer
          ? {
              ...conversation,
              offer: {
                amount:
                  status === "Countered" && counterAmount
                    ? Number(counterAmount)
                    : conversation.offer.amount,
                status,
              },
            }
          : conversation,
      ),
    );
    setCounterFor("");
    setCounterAmount("");
  }

  const showSignInPrompt =
    !isLoadingMessages && usesRealMessages && !currentUserId;
  const showEmptyThread =
    !isLoadingMessages && usesRealMessages && currentUserId && !activeConversation;

  return (
    <main className="messages-page">
      <style>{pageStyles}</style>
      <div className="messages-shell">
        <Header />

        <section className="page-heading">
          <span>Messages</span>
          <h1>Messages</h1>
          <p>Buyer and seller conversations for cards, offers, and shipping.</p>
        </section>

        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

        <section className="messages-layout">
          <aside className="conversation-list panel">
            <label className="message-search">
              <span aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search messages"
                aria-label="Search messages"
              />
            </label>

            <div className="conversation-rows">
              {isLoadingMessages ? (
                <p className="empty-copy">Loading messages...</p>
              ) : null}
              {!isLoadingMessages && filteredConversations.length === 0 ? (
                <p className="empty-copy">
                  {showSignInPrompt
                    ? "Sign in to view your messages."
                    : "No messages yet."}
                </p>
              ) : null}
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={conversation.id === activeConversation?.id ? "active" : ""}
                  onClick={() => {
                    setActiveId(conversation.id);
                    setConversations((items) =>
                      items.map((item) =>
                        item.id === conversation.id ? { ...item, unread: false } : item,
                      ),
                    );
                  }}
                >
                  <span className="unread-slot" aria-hidden="true">
                    {conversation.unread ? <span className="unread-dot" /> : null}
                  </span>
                  <div>
                    <strong>
                      {conversation.isActive ? <span className="online-dot" aria-hidden="true" /> : null}
                      {conversation.person}
                    </strong>
                    <span>{conversation.cardTitle}</span>
                    <p>{conversation.lastSnippet}</p>
                  </div>
                  <div className="conversation-meta">
                    <span>{conversation.timestamp}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="thread-panel panel">
            {showSignInPrompt ? (
              <div className="empty-thread">
                <h2>Sign in to view your messages.</h2>
                <p>Message a seller from a listing to start a conversation.</p>
                <Link href="/login">Sign In</Link>
              </div>
            ) : null}

            {showEmptyThread ? (
              <div className="empty-thread">
                <h2>No messages yet.</h2>
                <p>Message a seller from a listing to start a conversation.</p>
                <Link href="/browse">Browse Cards</Link>
              </div>
            ) : null}

            {activeConversation ? (
              <>
                <header className="thread-header">
                  <div>
                    <h2>{activeConversation.person}</h2>
                    <p>
                      {activeConversation.isActive ? (
                        <span className="online-dot" aria-hidden="true" />
                      ) : null}
                      {activeConversation.badge} · {activeConversation.cardTitle}
                    </p>
                  </div>
                  <Link href={activeConversation.cardHref}>View Card</Link>
                </header>

                <Link className="card-preview" href={activeConversation.cardHref}>
                  <CardArtwork accent={activeConversation.accent} />
                  <div>
                    <h3>{activeConversation.cardTitle}</h3>
                    <p>{formatCurrency(activeConversation.price)}</p>
                    {activeConversation.currentOffer ? (
                      <span>
                        Current offer{" "}
                        {formatCurrency(activeConversation.currentOffer)}
                      </span>
                    ) : null}
                  </div>
                  <strong>View Card</strong>
                </Link>

                {activeConversation.offer ? (
                  <div className="offer-card">
                    <div>
                      <span>Offer</span>
                      <strong>{formatCurrency(activeConversation.offer.amount)}</strong>
                      <p>Status: {activeConversation.offer.status}</p>
                    </div>
                    <div className="offer-actions">
                      <button type="button" onClick={() => updateOffer("Accepted")}>
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterFor(activeConversation.id)}
                      >
                        Counter
                      </button>
                      <button type="button" onClick={() => updateOffer("Declined")}>
                        Decline
                      </button>
                    </div>
                    {counterFor === activeConversation.id ? (
                      <div className="counter-row">
                        <input
                          type="number"
                          value={counterAmount}
                          onChange={(event) => setCounterAmount(event.target.value)}
                          placeholder="Counter amount"
                        />
                        <button
                          type="button"
                          onClick={() => updateOffer("Countered")}
                        >
                          Send
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="message-thread">
                  {activeConversation.messages.length === 0 ? (
                    <p className="empty-copy">
                      No messages in this conversation yet.
                    </p>
                  ) : null}
                  {activeConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message-bubble ${message.sender}`}
                    >
                      <p>{message.body}</p>
                      <span>{message.time}</span>
                    </div>
                  ))}
                </div>

                <form className="composer" onSubmit={sendMessage}>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message..."
                    aria-label="Write a message"
                  />
                  <button type="submit">Send</button>
                </form>
              </>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .messages-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% -120px, rgba(201,205,211,0.08), transparent 32%),
      linear-gradient(180deg, #000 0%, #030304 58%, #000 100%);
    color: #fafafa;
    font-family: Arial, Helvetica, sans-serif;
  }

  .messages-shell {
    width: 1240px;
    margin: 0 auto;
    padding: 8px 0 38px;
  }

  .panel {
    border: 1px solid #1d1d22;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.006)),
      rgba(5,5,6,0.92);
    box-shadow: 0 18px 44px rgba(0,0,0,0.28);
  }

  .page-heading {
    margin-top: 18px;
  }

  .page-heading span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .page-heading h1 {
    margin: 8px 0 0;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
  }

  .page-heading p,
  .thread-header p,
  .card-preview p,
  .card-preview span,
  .offer-card p,
  .empty-copy,
  .empty-thread p,
  .status-message {
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .status-message {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 10px 12px;
  }

  .messages-layout {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 16px;
    min-height: 680px;
  }

  .conversation-list,
  .thread-panel {
    padding: 14px;
  }

  .message-search {
    height: 38px;
    border: 1px solid #24242a;
    border-radius: 9px;
    background: #08080a;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
  }

  .message-search span {
    width: 12px;
    height: 12px;
    border: 2px solid #777985;
    border-radius: 999px;
    box-sizing: border-box;
  }

  .message-search input,
  .composer input,
  .counter-row input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #f4f4f5;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }

  .conversation-rows {
    margin-top: 12px;
    display: grid;
    gap: 8px;
  }

  .conversation-rows button {
    position: relative;
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    color: inherit;
    padding: 12px;
    display: grid;
    grid-template-columns: 14px 1fr auto;
    gap: 10px;
    align-items: center;
    text-align: left;
    cursor: pointer;
  }

  .unread-slot {
    width: 14px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 10px rgba(255,255,255,0.28);
  }

  .conversation-rows button.active,
  .conversation-rows button:hover {
    border-color: rgba(231,222,208,0.44);
    background: rgba(231,222,208,0.07);
  }

  .conversation-rows strong {
    display: block;
    color: #fff;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .online-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #34d399;
    box-shadow: 0 0 10px rgba(52,211,153,0.28);
    display: inline-flex;
    margin-right: 7px;
    vertical-align: 1px;
  }

  .conversation-rows span,
  .conversation-rows p,
  .conversation-meta {
    color: #a1a1aa;
    font-size: 11px;
    line-height: 15px;
    font-weight: 800;
  }

  .conversation-meta {
    text-align: right;
  }

  .thread-panel {
    display: grid;
    grid-template-rows: auto auto auto 1fr auto;
    gap: 12px;
  }

  .empty-copy {
    margin: 0;
    padding: 12px;
  }

  .empty-thread {
    min-height: 320px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 10px;
  }

  .empty-thread h2 {
    margin: 0;
    color: #fff;
    font-size: 24px;
    line-height: 30px;
    font-weight: 900;
  }

  .empty-thread a {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 38px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
  }

  .thread-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .thread-header h2,
  .card-preview h3 {
    margin: 0;
    color: #fff;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }

  .thread-header a,
  .card-preview strong,
  .offer-actions button,
  .counter-row button,
  .composer button {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 36px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .thread-header a:hover,
  .card-preview:hover strong,
  .offer-actions button:hover,
  .counter-row button:hover,
  .composer button:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .card-preview {
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.76);
    padding: 12px;
    display: grid;
    grid-template-columns: 86px 1fr auto;
    gap: 12px;
    align-items: center;
    color: inherit;
    text-decoration: none;
  }

  .card-art {
    width: 74px;
    height: 96px;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 9px;
    background: #030304;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-face {
    width: 54px;
    height: 76px;
    border: 1px solid rgba(244,244,245,0.48);
    border-radius: 7px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 12px 22px rgba(0,0,0,0.55);
  }

  .card-face span {
    position: absolute;
    left: 13px;
    top: 18px;
    width: 28px;
    height: 28px;
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 50%;
  }

  .card-face strong {
    position: absolute;
    left: 23px;
    top: 24px;
    width: 14px;
    height: 30px;
    border-radius: 999px 999px 8px 8px;
    background: rgba(255,255,255,0.75);
  }

  .offer-card {
    border: 1px solid rgba(52,211,153,0.18);
    border-radius: 12px;
    background: rgba(52,211,153,0.055);
    padding: 12px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
  }

  .offer-card span {
    color: #86efac;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .offer-card strong {
    display: block;
    margin-top: 5px;
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .offer-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .counter-row {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
  }

  .counter-row input {
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    padding: 0 12px;
    min-height: 38px;
  }

  .message-thread {
    min-height: 280px;
    overflow-y: auto;
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.52);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-bubble {
    max-width: 70%;
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(5,5,6,0.9);
    padding: 10px;
  }

  .message-bubble.buyer {
    align-self: flex-end;
    border-color: rgba(231,222,208,0.26);
    background: rgba(231,222,208,0.07);
  }

  .message-bubble p {
    margin: 0;
    color: #fff;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .message-bubble span {
    display: block;
    margin-top: 6px;
    color: #85858f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 800;
  }

  .composer {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    min-height: 46px;
  }

  .composer input {
    height: 42px;
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    padding: 0 12px;
  }

  .composer button {
    height: 42px;
  }

  .composer input {
    border: 1px solid #24242a;
    border-radius: 10px;
    background: #08080a;
    padding: 0 12px;
    min-height: 42px;
  }

  @media (max-width: 1100px) {
    .messages-shell {
      width: calc(100vw - 32px);
    }

    .messages-layout,
    .card-preview,
    .offer-card {
      grid-template-columns: 1fr;
    }

    .thread-panel {
      grid-template-rows: auto;
    }
  }
`;
