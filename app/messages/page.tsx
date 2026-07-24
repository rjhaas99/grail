"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import CollectorLevelBadge from "../components/CollectorLevelBadge";
import Header from "../components/Header";
import { hasCollectorLevelBadge } from "../lib/collectorLevelBadges";
import type { MockConversation } from "../lib/mockData";
import { getPublicCollectorHref } from "../lib/publicCollectorLinks";

type ConversationMessage = MockConversation["messages"][number] & {
  listingId?: string | null;
  listingTitle?: string | null;
  listingImageUrl?: string | null;
  listingHref?: string | null;
  listingStatus?: string | null;
  saleFormat?: string | null;
  isCollectionCard?: boolean;
  isPublicCollection?: boolean;
  price?: number;
  createdAt?: string | null;
};

type Conversation = Omit<MockConversation, "messages"> & {
  messages: ConversationMessage[];
  source?: "mock" | "supabase";
  buyerId?: string | null;
  sellerId?: string | null;
  collectorHref?: string;
  listingId?: string | null;
  listingImageUrl?: string | null;
  listingStatus?: string | null;
  saleFormat?: string | null;
  isCollectionCard?: boolean;
  isPublicCollection?: boolean;
  player?: string;
  year?: string;
  brand?: string;
  cardNumber?: string;
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
  status?: string | null;
  sale_format?: string | null;
  is_collection_card?: boolean | null;
  is_public_collection?: boolean | null;
  player?: string | null;
  player_name?: string | null;
  year?: string | null;
  brand?: string | null;
  card_number?: string | null;
  listing_images?: Array<{
    image_url: string | null;
    image_type: string | null;
  }> | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type ConversationTab =
  | "all"
  | "unread"
  | "offers"
  | "orders"
  | "collection"
  | "for_sale"
  | "archived";
type MessageViewMode = "comfortable" | "compact";

const initialConversations: Conversation[] = [];
const mockConversationStorageKey = "grail-mock-conversations";
const messageViewStorageKey = "grail-messages-view";
const pinnedConversationStorageKey = "grail-pinned-conversations";
const archivedConversationStorageKey = "grail-archived-conversations";

const conversationTabs: Array<{ id: ConversationTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "offers", label: "Offers" },
  { id: "orders", label: "Orders" },
  { id: "collection", label: "Collection Cards" },
  { id: "for_sale", label: "For Sale Cards" },
  { id: "archived", label: "Archived" },
];

const quickReplies = [
  "Thanks!",
  "Still available.",
  "I'll counter.",
  "Tracking uploaded.",
  "Offer accepted.",
  "Offer declined.",
  "Shipping tomorrow.",
];

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

function getMessageGroupId(otherUserId: string | null) {
  return otherUserId || "unknown-user";
}

function getListingFrontImage(listing?: ListingRow | null) {
  return (
    listing?.listing_images?.find((image) => image.image_type === "front")?.image_url ||
    listing?.listing_images?.find((image) => Boolean(image.image_url))?.image_url ||
    null
  );
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "GC";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function readIdList(storageKey: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(storageKey);

    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function getMessageViewPreference(): MessageViewMode {
  if (typeof window === "undefined") {
    return "comfortable";
  }

  return window.localStorage.getItem(messageViewStorageKey) === "compact"
    ? "compact"
    : "comfortable";
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
    console.error("Conversation read error:", error);
    return [];
  }
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

function getCardStatus(conversation: Conversation) {
  const status = conversation.listingStatus?.toLowerCase() || "";

  if (conversation.saleFormat === "auction") {
    return "Auction";
  }

  if (status === "sold") {
    return "Sold";
  }

  if (
    conversation.isCollectionCard ||
    conversation.isPublicCollection ||
    status === "collection"
  ) {
    return "Offer Only";
  }

  if (status === "active" || conversation.price > 0) {
    return "For Sale";
  }

  return "Collection";
}

function getMessageCardStatus(message: ConversationMessage, conversation: Conversation) {
  const status = message.listingStatus?.toLowerCase() || "";

  if (message.saleFormat === "auction") {
    return "Auction";
  }

  if (status === "sold") {
    return "Sold";
  }

  if (
    message.isCollectionCard ||
    message.isPublicCollection ||
    status === "collection"
  ) {
    return "Offer Only";
  }

  if (status === "active" || Number(message.price || 0) > 0) {
    return "For Sale";
  }

  return getCardStatus(conversation);
}

function isOfferConversation(conversation: Conversation) {
  const text = `${conversation.lastSnippet} ${conversation.snippet} ${conversation.messages
    .map((message) => message.body)
    .join(" ")}`.toLowerCase();

  return Boolean(
    conversation.offer ||
      conversation.currentOffer ||
      text.includes("offer") ||
      text.includes("counter"),
  );
}

function isOrderConversation(conversation: Conversation) {
  const text = `${conversation.lastSnippet} ${conversation.snippet} ${conversation.messages
    .map((message) => message.body)
    .join(" ")}`.toLowerCase();

  return (
    getCardStatus(conversation) === "Sold" ||
    text.includes("order") ||
    text.includes("tracking") ||
    text.includes("shipping") ||
    text.includes("ship") ||
    text.includes("label") ||
    text.includes("delivered")
  );
}

function isCollectionConversation(conversation: Conversation) {
  return ["Offer Only", "Collection"].includes(getCardStatus(conversation));
}

function isForSaleConversation(conversation: Conversation) {
  return getCardStatus(conversation) === "For Sale";
}

function getConversationStatus(conversation: Conversation, archivedIds: string[]) {
  if (archivedIds.includes(conversation.id)) {
    return "Archived";
  }

  if (conversation.unread) {
    return "Unread";
  }

  if (conversation.offer?.status) {
    return `Offer ${conversation.offer.status}`;
  }

  if (isOfferConversation(conversation)) {
    return conversation.currentOffer ? "Offer Pending" : "Offer";
  }

  if (isOrderConversation(conversation)) {
    return getCardStatus(conversation) === "Sold" ? "Completed" : "Order Active";
  }

  return "Read";
}

function getCollectorRoute(conversation: Conversation) {
  return (
    conversation.collectorHref ||
    getPublicCollectorHref({ id: conversation.sellerId || conversation.id })
  );
}

function getMessageGroupLabel(message: ConversationMessage) {
  if (!message.createdAt) {
    return message.time?.includes("AM") || message.time?.includes("PM") ? "Today" : "Recent";
  }

  const messageDate = new Date(message.createdAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  const daysAgo = Math.floor(
    (today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysAgo > 1 && daysAgo < 8) {
    return "Last Week";
  }

  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MessagesFallback() {
  return (
    <main className="messages-page">
      <style>{pageStyles}</style>
      <div className="messages-shell">
        <Header />
        <section className="messages-hero panel">
          <div>
            <span>Messages</span>
            <h1>Messages</h1>
            <p>Loading conversations...</p>
          </div>
        </section>
        <section className="messages-workspace panel">
          <div className="empty-state">
            <h2>Loading messages</h2>
            <p>Preparing your conversations.</p>
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
  const requestedUserId = searchParams.get("user");
  const requestedMockConversationId = searchParams.get("mockConversation");
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [counterFor, setCounterFor] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [usesRealMessages, setUsesRealMessages] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ConversationTab>("all");
  const [viewMode, setViewMode] = useState<MessageViewMode>(() => getMessageViewPreference());
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readIdList(pinnedConversationStorageKey));
  const [archivedIds, setArchivedIds] = useState<string[]>(() => readIdList(archivedConversationStorageKey));

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
          setUsesRealMessages(true);
          setConversations([]);
          setActiveId("");
          setStatusMessage("Messages are temporarily unavailable.");
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
        const requestedOtherUserId = requestedUserId || requestedSellerId || "";
        const requestedGroupId =
          requestedOtherUserId
            ? getMessageGroupId(requestedOtherUserId)
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
              requestedOtherUserId,
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
            .select(
              `
                id,
                title,
                price,
                seller_id,
                status,
                sale_format,
                is_collection_card,
                is_public_collection,
                player,
                player_name,
                year,
                brand,
                card_number,
                listing_images (
                  image_url,
                  image_type
                )
              `,
            )
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
          const groupId = getMessageGroupId(otherUserId);
          const existingGroup = groupedMessages.get(groupId);

          if (existingGroup) {
            existingGroup.messages.push(message);
            if (message.listing_id) {
              existingGroup.listingId = message.listing_id;
            }
          } else {
            groupedMessages.set(groupId, {
              listingId: message.listing_id,
              otherUserId,
              messages: [message],
            });
          }
        });

        if (requestedOtherUserId && requestedGroupId && !groupedMessages.has(requestedGroupId)) {
          groupedMessages.set(requestedGroupId, {
            listingId: requestedListingId,
            otherUserId: requestedOtherUserId,
            messages: [],
          });
        } else if (requestedListingId && requestedGroupId) {
          const requestedGroup = groupedMessages.get(requestedGroupId);

          if (requestedGroup) {
            requestedGroup.listingId = requestedListingId;
          }
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
            const latestListing = latestMessage?.listing_id
              ? listingsById.get(latestMessage.listing_id)
              : listing;
            const otherProfile = group.otherUserId
              ? profilesById.get(group.otherUserId)
              : undefined;
            const participantName = getProfileName(otherProfile);
            const cardTitle = latestListing?.title || listing?.title || "GRAIL Card";
            const cardHref = latestListing?.id || group.listingId
              ? `/cards/${latestListing?.id || group.listingId}`
              : "/browse";
            const latestTime = latestMessage?.created_at || null;
            const snippet = latestMessage?.body || "Conversation ready.";
            const participantRole =
              latestListing?.seller_id && group.otherUserId === latestListing.seller_id
                ? "Seller"
                : latestListing
                  ? "Buyer"
                  : "GRAIL User";
            const listingImageUrl = getListingFrontImage(latestListing || listing);

            return {
              id: groupId,
              source: "supabase" as const,
              buyerId: userId,
              sellerId: group.otherUserId,
              collectorHref: getPublicCollectorHref(otherProfile, group.otherUserId),
              listingId: latestListing?.id || group.listingId,
              listingStatus: latestListing?.status || listing?.status || null,
              saleFormat: latestListing?.sale_format || listing?.sale_format || null,
              isCollectionCard: Boolean(
                latestListing?.is_collection_card || listing?.is_collection_card,
              ),
              isPublicCollection: Boolean(
                latestListing?.is_public_collection || listing?.is_public_collection,
              ),
              player: latestListing?.player || latestListing?.player_name || listing?.player || listing?.player_name || "",
              year: latestListing?.year || listing?.year || "",
              brand: latestListing?.brand || listing?.brand || "",
              cardNumber: latestListing?.card_number || listing?.card_number || "",
              participantName,
              participantRole,
              person: participantName,
              badge: participantRole,
              cardId: latestListing?.id || group.listingId || groupId,
              cardTitle,
              cardRoute: cardHref,
              cardHref,
              listingImageUrl,
              price: Number(latestListing?.price || listing?.price || 0),
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
                createdAt: message.created_at,
                listingId: message.listing_id,
                listingTitle: message.listing_id
                  ? listingsById.get(message.listing_id)?.title || "GRAIL Card"
                  : null,
                listingImageUrl: message.listing_id
                  ? getListingFrontImage(listingsById.get(message.listing_id))
                  : null,
                listingHref: message.listing_id ? `/cards/${message.listing_id}` : null,
                listingStatus: message.listing_id
                  ? listingsById.get(message.listing_id)?.status || null
                  : null,
                saleFormat: message.listing_id
                  ? listingsById.get(message.listing_id)?.sale_format || null
                  : null,
                isCollectionCard: Boolean(
                  message.listing_id
                    ? listingsById.get(message.listing_id)?.is_collection_card
                    : false,
                ),
                isPublicCollection: Boolean(
                  message.listing_id
                    ? listingsById.get(message.listing_id)?.is_public_collection
                    : false,
                ),
                price: Number(
                  message.listing_id
                    ? listingsById.get(message.listing_id)?.price || 0
                    : 0,
                ),
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
              : [];

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
        if (!isMounted) {
          return;
        }

        setUsesRealMessages(true);
        setConversations([]);
        setActiveId("");
        setStatusMessage("Messages are temporarily unavailable.");
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
    requestedUserId,
  ]);

  useEffect(() => {
    window.localStorage.setItem(messageViewStorageKey, viewMode);
  }, [viewMode]);

  useEffect(() => {
    window.localStorage.setItem(pinnedConversationStorageKey, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  useEffect(() => {
    window.localStorage.setItem(archivedConversationStorageKey, JSON.stringify(archivedIds));
  }, [archivedIds]);

  const getTabMatch = useCallback(
    (conversation: Conversation, tab: ConversationTab) => {
      const isArchived = archivedIds.includes(conversation.id);

      if (tab === "archived") {
        return isArchived;
      }

      if (isArchived) {
        return false;
      }

      if (tab === "all") return true;
      if (tab === "unread") return Boolean(conversation.unread);
      if (tab === "offers") return isOfferConversation(conversation);
      if (tab === "orders") return isOrderConversation(conversation);
      if (tab === "collection") return isCollectionConversation(conversation);
      if (tab === "for_sale") return isForSaleConversation(conversation);

      return true;
    },
    [archivedIds],
  );

  const tabCounts = useMemo(() => {
    return conversationTabs.reduce<Record<ConversationTab, number>>(
      (counts, tab) => {
        counts[tab.id] = conversations.filter((conversation) =>
          getTabMatch(conversation, tab.id),
        ).length;
        return counts;
      },
      {
        all: 0,
        unread: 0,
        offers: 0,
        orders: 0,
        collection: 0,
        for_sale: 0,
        archived: 0,
      },
    );
  }, [conversations, getTabMatch]);

  const summaryStats = useMemo(
    () => [
      { label: "Unread", value: conversations.filter((conversation) => conversation.unread).length },
      {
        label: "Buyer Conversations",
        value: conversations.filter((conversation) => conversation.participantRole === "Buyer").length,
      },
      {
        label: "Seller Conversations",
        value: conversations.filter((conversation) => conversation.participantRole === "Seller").length,
      },
      { label: "Offer Conversations", value: conversations.filter(isOfferConversation).length },
      { label: "Order Conversations", value: conversations.filter(isOrderConversation).length },
    ],
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const tabbedConversations = conversations.filter((conversation) =>
      getTabMatch(conversation, activeTab),
    );
    const sortedConversations = [...tabbedConversations].sort((first, second) => {
      const firstPinned = pinnedIds.includes(first.id);
      const secondPinned = pinnedIds.includes(second.id);

      if (firstPinned !== secondPinned) {
        return firstPinned ? -1 : 1;
      }

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
        conversation.participantName,
        conversation.participantRole,
        conversation.cardTitle,
        conversation.player,
        conversation.year,
        conversation.brand,
        conversation.cardNumber,
        conversation.lastSnippet,
        conversation.currentOffer,
        conversation.price,
        conversation.messages.map((message) => message.body).join(" "),
        conversation.listingId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [activeTab, conversations, getTabMatch, pinnedIds, searchQuery]);

  const activeConversation =
    filteredConversations.find((conversation) => conversation.id === activeId) ||
    filteredConversations[0] ||
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

      if (!activeConversation.sellerId) {
        logMessageSupabaseError({
          step: "messages composer missing receiver or listing",
          listingId: activeConversation.listingId,
          sellerId: activeConversation.sellerId,
          buyerId: currentUserId,
          error: new Error("Missing receiver_id for direct message."),
        });
        setStatusMessage("Message could not be sent.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatusMessage("Sign in to send messages.");
        return;
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          receiverId: activeConversation.sellerId,
          listingId: activeConversation.listingId,
          body,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: MessageRow;
      };

      if (!response.ok || !payload.message) {
        logMessageSupabaseError({
          step: "messages composer message insert",
          listingId: activeConversation.listingId,
          sellerId: activeConversation.sellerId,
          buyerId: currentUserId,
          payload,
          error: new Error(payload.error || "Message could not be sent."),
        });
        setStatusMessage(payload.error || "Message could not be sent.");
        return;
      }

      const insertedMessage = payload.message;

      setConversations((items) =>
        items.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                unread: false,
                lastSnippet: body,
                snippet: body,
                timestamp: "Now",
                sortRank: Date.now(),
                messages: [
                  ...conversation.messages,
                  {
                    id: insertedMessage.id,
                    sender: "buyer",
                    body,
                    time: "Now",
                    createdAt: insertedMessage.created_at,
                    listingId: activeConversation.listingId,
                    listingTitle: activeConversation.cardTitle,
                    listingImageUrl: activeConversation.listingImageUrl,
                    listingHref: activeConversation.cardHref,
                    listingStatus: activeConversation.listingStatus,
                    saleFormat: activeConversation.saleFormat,
                    isCollectionCard: activeConversation.isCollectionCard,
                    isPublicCollection: activeConversation.isPublicCollection,
                    price: activeConversation.price,
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
              timestamp: "Now",
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

  function selectConversation(conversationId: string) {
    setActiveId(conversationId);
    setConversations((items) =>
      items.map((item) =>
        item.id === conversationId ? { ...item, unread: false } : item,
      ),
    );
  }

  function togglePin(conversationId: string) {
    setPinnedIds((items) =>
      items.includes(conversationId)
        ? items.filter((id) => id !== conversationId)
        : [...items, conversationId],
    );
  }

  function toggleArchive(conversationId: string) {
    setArchivedIds((items) =>
      items.includes(conversationId)
        ? items.filter((id) => id !== conversationId)
        : [...items, conversationId],
    );
  }

  function insertQuickReply(value: string) {
    setDraft((current) => (current ? `${current} ${value}` : value));
  }

  function renderConversationBadges(conversation: Conversation) {
    return (
      <div className="conversation-badges">
        {isOfferConversation(conversation) ? <span>Offer</span> : null}
        {isOrderConversation(conversation) ? <span>Order</span> : null}
      </div>
    );
  }

  function renderTimelineCardPreview({
    conversation,
    message,
  }: {
    conversation: Conversation;
    message?: ConversationMessage;
  }) {
    const title = message?.listingTitle || conversation.cardTitle;
    const href = message?.listingHref || conversation.cardHref;
    const imageUrl = message?.listingImageUrl || conversation.listingImageUrl;
    const status = message ? getMessageCardStatus(message, conversation) : getCardStatus(conversation);

    return (
      <section className="timeline-card-preview">
        <div className="timeline-card-image">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={68}
              height={90}
              unoptimized
            />
          ) : (
            <CardArtwork accent={conversation.accent} />
          )}
        </div>
        <div>
          <span>Card Preview</span>
          <h3>{title}</h3>
          <div className="context-pill-row">
            <span>{status}</span>
            <Link href={href}>View Card</Link>
          </div>
        </div>
      </section>
    );
  }

  function renderEmptyConversationList() {
    if (isLoadingMessages) {
      return <div className="empty-state small"><h2>Loading messages</h2><p>Preparing conversations.</p></div>;
    }

    if (!currentUserId && usesRealMessages) {
      return <div className="empty-state small"><h2>Sign in required</h2><p>Sign in to view your messages.</p></div>;
    }

    const label = conversationTabs.find((tab) => tab.id === activeTab)?.label || "Messages";

    return (
      <div className="empty-state small">
        <h2>No {label.toLowerCase()} messages</h2>
        <p>Matching conversations will appear here.</p>
      </div>
    );
  }

  function renderActionCard(conversation: Conversation) {
    if (conversation.offer || conversation.currentOffer || isOfferConversation(conversation)) {
      const amount = conversation.offer?.amount || conversation.currentOffer || 0;
      const status = conversation.offer?.status || "Pending";

      return (
        <section className="context-action-card offer-context-card">
          <div>
            <span>Offer {status}</span>
            <strong>{amount > 0 ? formatCurrency(amount) : "Offer conversation"}</strong>
            <p>Keep the negotiation tied to this card.</p>
          </div>
          <div className="context-action-buttons">
            {conversation.offer ? (
              <>
                <button type="button" onClick={() => updateOffer("Accepted")}>Accept</button>
                <button type="button" onClick={() => setCounterFor(conversation.id)}>Counter</button>
                <button type="button" onClick={() => updateOffer("Declined")}>Decline</button>
              </>
            ) : null}
            <Link href="/offers">View Offer</Link>
          </div>
          {counterFor === conversation.id ? (
            <div className="counter-row">
              <input
                type="number"
                value={counterAmount}
                onChange={(event) => setCounterAmount(event.target.value)}
                placeholder="Counter amount"
              />
              <button type="button" onClick={() => updateOffer("Countered")}>Send</button>
            </div>
          ) : null}
        </section>
      );
    }

    if (isOrderConversation(conversation)) {
      return (
        <section className="context-action-card">
          <div>
            <span>Order Active</span>
            <strong>{conversation.cardTitle}</strong>
            <p>Use Orders for fulfillment, tracking, inspection, and payout status.</p>
          </div>
          <div className="context-action-buttons">
            <Link href="/orders">View Order</Link>
          </div>
        </section>
      );
    }

    if (isCollectionConversation(conversation)) {
      return (
        <section className="context-action-card">
          <div>
            <span>Collection Card</span>
            <strong>{conversation.cardTitle}</strong>
            <p>This card may not be listed for instant purchase, but negotiation can continue.</p>
          </div>
          <div className="context-action-buttons">
            {conversation.listingId ? (
              <Link href={`/make-offer?listingId=${encodeURIComponent(conversation.listingId)}`}>
                Make Offer
              </Link>
            ) : null}
          </div>
        </section>
      );
    }

    return null;
  }

  function renderMessageThread(conversation: Conversation) {
    let previousGroup = "";
    const renderedListingContexts = new Set<string>();
    let renderedFallbackContext = false;

    return (
      <div className="message-thread">
        {conversation.messages.length === 0 ? (
          <>
            {conversation.listingId ? renderTimelineCardPreview({ conversation }) : null}
            <div className="empty-state small">
              <h2>No messages yet</h2>
              <p>Send the first message in this conversation.</p>
            </div>
          </>
        ) : null}
        {conversation.messages.map((message) => {
          const nextGroup = getMessageGroupLabel(message);
          const shouldShowGroup = nextGroup !== previousGroup;
          const shouldRenderListingContext = Boolean(
            message.listingId && !renderedListingContexts.has(message.listingId),
          );
          const shouldRenderFallbackContext = Boolean(
            !message.listingId &&
              conversation.listingId &&
              !renderedFallbackContext &&
              conversation.messages.every((item) => !item.listingId),
          );

          if (message.listingId) {
            renderedListingContexts.add(message.listingId);
          } else if (shouldRenderFallbackContext) {
            renderedFallbackContext = true;
          }

          previousGroup = nextGroup;

          return (
            <div key={message.id} className="message-group-item">
              {shouldShowGroup ? <div className="message-date-divider">{nextGroup}</div> : null}
              {shouldRenderListingContext
                ? renderTimelineCardPreview({ conversation, message })
                : null}
              {shouldRenderFallbackContext
                ? renderTimelineCardPreview({ conversation })
                : null}
              <div className={`message-bubble ${message.sender}`}>
                <p>{message.body}</p>
                <span>{message.time}</span>
              </div>
            </div>
          );
        })}
        {renderActionCard(conversation)}
      </div>
    );
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

        <section className="messages-hero panel">
          <div>
            <span>Messages</span>
            <h1>Messages</h1>
            <p>Stay connected with buyers, sellers, offers, and collection inquiries.</p>
          </div>
          <Link href="/browse">Browse Cards</Link>
        </section>

        <section className="message-summary-row" aria-label="Quick message summary">
          {summaryStats.map((stat) => (
            <article key={stat.label} className="message-summary-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="conversation-nav panel" aria-label="Conversation filters">
          {conversationTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span>{tabCounts[tab.id]}</span>
            </button>
          ))}
        </section>

        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

        <section className={`messages-workspace panel messages-${viewMode}`}>
          <aside className="conversation-sidebar">
            <div className="messages-toolbar">
              <label className="message-search">
                <span>Search Conversations</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search buyer, seller, card, message, offer..."
                  aria-label="Search messages"
                />
              </label>
              <div className="view-toggle" aria-label="Message density">
                <button
                  type="button"
                  className={viewMode === "comfortable" ? "is-active" : ""}
                  onClick={() => setViewMode("comfortable")}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  className={viewMode === "compact" ? "is-active" : ""}
                  onClick={() => setViewMode("compact")}
                >
                  Compact
                </button>
              </div>
            </div>

            <div className="conversation-rows">
              {filteredConversations.length === 0 ? renderEmptyConversationList() : null}
              {filteredConversations.map((conversation) => {
                const isPinned = pinnedIds.includes(conversation.id);
                const isActive = conversation.id === activeConversation?.id;
                const status = getConversationStatus(conversation, archivedIds);

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`${isActive ? "active" : ""} ${conversation.unread ? "unread" : ""}`}
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="collector-avatar" aria-hidden="true">
                      {getInitials(conversation.person)}
                    </div>
                    <div className="conversation-row-copy">
                      <div className="conversation-row-title">
                        <strong>
                          {conversation.isActive ? (
                            <span className="online-dot" aria-hidden="true" />
                          ) : null}
                          {conversation.person}
                        </strong>
                        <span>{conversation.timestamp}</span>
                      </div>
                      <p>{conversation.lastSnippet}</p>
                      <div className="conversation-row-footer">
                        <span className={`message-status-pill status-${status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                          {status}
                        </span>
                        {isPinned ? <span className="pinned-indicator">Pinned</span> : null}
                        {renderConversationBadges(conversation)}
                      </div>
                    </div>
                    {conversation.unread ? <span className="unread-dot" aria-label="Unread" /> : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="thread-panel">
            {showSignInPrompt ? (
              <div className="empty-state">
                <h2>Sign in to view your messages</h2>
                <p>Message a seller from a listing to start a conversation.</p>
                <Link href="/login">Sign In</Link>
              </div>
            ) : null}

            {showEmptyThread ? (
              <div className="empty-state">
                <h2>No messages yet</h2>
                <p>Message a seller from a listing to start a conversation.</p>
                <Link href="/browse">Browse Cards</Link>
              </div>
            ) : null}

            {activeConversation ? (
              <>
                <header className="thread-header">
                  <Link
                    className="thread-collector thread-collector-link"
                    href={getCollectorRoute(activeConversation)}
                  >
                    <div className="collector-avatar large" aria-hidden="true">
                      {getInitials(activeConversation.person)}
                    </div>
                    <div>
                      <span>Collector</span>
                      <h2>{activeConversation.person}</h2>
                      <p>
                        {activeConversation.isActive ? (
                          <span className="online-dot" aria-hidden="true" />
                        ) : null}
                        {hasCollectorLevelBadge(activeConversation.badge) ? (
                          <span className="thread-rank-badge">
                            <CollectorLevelBadge rank={activeConversation.badge} size="xs" />
                            {activeConversation.badge}
                          </span>
                        ) : (
                          activeConversation.badge
                        )}
                      </p>
                    </div>
                  </Link>
                  <div className="thread-actions">
                    <Link href={getCollectorRoute(activeConversation)}>View Collector</Link>
                    <Link href="/contact-support">Report</Link>
                    <button type="button">More</button>
                    <button type="button" onClick={() => togglePin(activeConversation.id)}>
                      {pinnedIds.includes(activeConversation.id) ? "Unpin" : "Pin"}
                    </button>
                    <button type="button" onClick={() => toggleArchive(activeConversation.id)}>
                      {archivedIds.includes(activeConversation.id) ? "Unarchive" : "Archive"}
                    </button>
                  </div>
                </header>
                {renderMessageThread(activeConversation)}

                <div className="quick-reply-row" aria-label="Quick replies">
                  {quickReplies.map((reply) => (
                    <button key={reply} type="button" onClick={() => insertQuickReply(reply)}>
                      {reply}
                    </button>
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

  .messages-hero {
    margin-top: 10px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: end;
  }

  .messages-hero span,
  .message-summary-stat span,
  .message-search span,
  .thread-collector > div:last-child > span,
  .timeline-card-preview span,
  .context-action-card span {
    color: #C9CDD3;
    font-size: 11px;
    line-height: 14px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .messages-hero h1 {
    margin: 8px 0 4px;
    color: #fff;
    font-size: 42px;
    line-height: 46px;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .messages-hero p,
  .thread-header p,
  .timeline-card-preview p,
  .context-action-card p,
  .empty-state p,
  .status-message,
  .conversation-row-copy p {
    margin: 0;
    color: #a1a1aa;
    font-size: 13px;
    line-height: 18px;
    font-weight: 800;
  }

  .messages-hero a,
  .thread-actions a,
  .thread-actions button,
  .context-action-buttons a,
  .context-action-buttons button,
  .context-pill-row a,
  .counter-row button,
  .quick-reply-row button,
  .composer button,
  .view-toggle button,
  .empty-state a {
    border: 1px solid rgba(231,222,208,0.28);
    border-radius: 10px;
    background: rgba(231,222,208,0.055);
    color: #fff;
    min-height: 36px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .messages-hero a:hover,
  .thread-actions a:hover,
  .thread-actions button:hover,
  .context-action-buttons a:hover,
  .context-action-buttons button:hover,
  .context-pill-row a:hover,
  .counter-row button:hover,
  .quick-reply-row button:hover,
  .composer button:hover,
  .view-toggle button:hover,
  .empty-state a:hover {
    border-color: rgba(231,222,208,0.62);
    background: rgba(231,222,208,0.11);
    box-shadow: 0 0 18px rgba(201,205,211,0.13);
  }

  .message-summary-row {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .message-summary-stat {
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 12px;
    background: rgba(8,8,10,0.58);
    min-height: 72px;
    padding: 11px;
    display: grid;
    gap: 6px;
  }

  .message-summary-stat strong {
    color: #fff;
    font-size: 24px;
    line-height: 28px;
    font-weight: 900;
  }

  .conversation-nav {
    margin-top: 14px;
    padding: 10px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
  }

  .conversation-nav button {
    flex: 0 0 auto;
    border: 1px solid rgba(201,205,211,0.14);
    border-radius: 10px;
    background: rgba(8,8,10,0.72);
    color: #C9CDD3;
    min-height: 36px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .conversation-nav button.is-active,
  .view-toggle button.is-active {
    border-color: rgba(231,222,208,0.48);
    background: rgba(231,222,208,0.12);
    color: #fff;
  }

  .conversation-nav button span {
    margin-left: 8px;
    border-radius: 999px;
    background: rgba(201,205,211,0.1);
    color: #fff;
    min-width: 22px;
    padding: 3px 7px;
    font-size: 10px;
    line-height: 12px;
  }

  .status-message {
    margin: 14px 0 0;
    border: 1px solid rgba(201,205,211,0.16);
    border-radius: 10px;
    background: rgba(201,205,211,0.045);
    padding: 10px 12px;
  }

  .messages-workspace {
    margin-top: 14px;
    padding: 14px;
    display: grid;
    grid-template-columns: 410px minmax(0, 1fr);
    gap: 14px;
    min-height: 680px;
  }

  .conversation-sidebar {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 12px;
    min-width: 0;
  }

  .messages-toolbar {
    display: grid;
    gap: 9px;
  }

  .message-search {
    display: grid;
    gap: 7px;
  }

  .message-search input,
  .composer input,
  .counter-row input {
    width: 100%;
    min-width: 0;
    border: 1px solid #202026;
    border-radius: 10px;
    background: rgba(8,8,10,0.84);
    color: #fff;
    min-height: 40px;
    padding: 0 11px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }

  .view-toggle,
  .conversation-row-footer,
  .conversation-badges,
  .thread-actions,
  .context-pill-row,
  .context-action-buttons,
  .quick-reply-row {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .conversation-rows {
    display: grid;
    gap: 8px;
    align-content: start;
    max-height: 630px;
    overflow: auto;
    padding-right: 3px;
  }

  .conversation-rows button {
    position: relative;
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.72);
    color: inherit;
    padding: 11px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    text-align: left;
    cursor: pointer;
  }

  .messages-compact .conversation-rows button {
    grid-template-columns: 34px minmax(0, 1fr);
    padding: 9px;
  }

  .conversation-rows button.active,
  .conversation-rows button:hover {
    border-color: rgba(231,222,208,0.44);
    background: rgba(231,222,208,0.07);
  }

  .conversation-rows button.unread {
    border-color: rgba(231,222,208,0.34);
    background: rgba(231,222,208,0.08);
  }

  .collector-avatar {
    width: 40px;
    height: 40px;
    border: 1px solid rgba(201,205,211,0.2);
    border-radius: 999px;
    background: linear-gradient(135deg, #1f2937, #050506);
    color: #E7DED0;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 900;
  }

  .collector-avatar.large {
    width: 52px;
    height: 52px;
    font-size: 14px;
  }

  .messages-compact .collector-avatar {
    width: 32px;
    height: 32px;
    font-size: 10px;
  }

  .conversation-row-copy {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .conversation-row-title {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: baseline;
  }

  .conversation-row-title strong,
  .thread-header h2,
  .timeline-card-preview h3,
  .context-action-card strong,
  .empty-state h2 {
    margin: 0;
    color: #fff;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
  }

  .conversation-row-title span {
    margin: 0;
    color: #C9CDD3;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }

  .conversation-row-copy p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message-status-pill,
  .conversation-badges span,
  .pinned-indicator,
  .context-pill-row span {
    border: 1px solid rgba(201,205,211,0.18);
    border-radius: 999px;
    background: rgba(201,205,211,0.055);
    color: #C9CDD3;
    padding: 4px 8px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .status-unread,
  .status-offer-pending,
  .status-offer-accepted,
  .status-order-active {
    border-color: rgba(231,222,208,0.28);
    background: rgba(231,222,208,0.08);
    color: #E7DED0;
  }

  .status-completed {
    border-color: rgba(52,211,153,0.24);
    background: rgba(52,211,153,0.08);
    color: #86efac;
  }

  .unread-dot {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 10px rgba(255,255,255,0.28);
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

  .thread-panel {
    min-width: 0;
    display: grid;
    grid-template-rows: auto auto auto minmax(280px, 1fr) auto auto;
    gap: 12px;
  }

  .thread-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .thread-collector {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 11px;
    align-items: center;
  }

  .thread-collector-link {
    color: inherit;
    text-decoration: none;
  }

  .thread-collector-link:hover h2 {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .thread-rank-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .timeline-card-preview {
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.76);
    padding: 12px;
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
  }

  .timeline-card-image {
    width: 68px;
    height: 90px;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 10px;
    background: #030304;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .timeline-card-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .timeline-card-image .card-art,
  .timeline-card-image .card-face {
    transform: scale(0.86);
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

  .context-action-card {
    border: 1px solid rgba(231,222,208,0.18);
    border-radius: 12px;
    background: rgba(231,222,208,0.055);
    padding: 12px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .offer-context-card {
    border-color: rgba(52,211,153,0.18);
    background: rgba(52,211,153,0.055);
  }

  .counter-row {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }

  .message-thread {
    overflow-y: auto;
    border: 1px solid #202026;
    border-radius: 12px;
    background: rgba(8,8,10,0.52);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .message-group-item {
    display: grid;
    gap: 8px;
  }

  .message-date-divider {
    justify-self: center;
    border: 1px solid rgba(201,205,211,0.12);
    border-radius: 999px;
    background: rgba(8,8,10,0.78);
    color: #85858f;
    padding: 5px 9px;
    font-size: 10px;
    line-height: 12px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .message-bubble {
    max-width: 72%;
    border: 1px solid #202026;
    border-radius: 14px;
    background: rgba(5,5,6,0.9);
    padding: 11px;
  }

  .message-bubble.buyer {
    justify-self: end;
    border-color: rgba(231,222,208,0.26);
    background: rgba(231,222,208,0.07);
  }

  .message-bubble.seller {
    justify-self: start;
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

  .quick-reply-row {
    border: 1px solid rgba(201,205,211,0.1);
    border-radius: 12px;
    background: rgba(8,8,10,0.5);
    padding: 10px;
  }

  .quick-reply-row button {
    min-height: 30px;
    color: #C9CDD3;
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
  }

  .composer button {
    height: 42px;
  }

  .empty-state {
    border: 1px dashed rgba(201,205,211,0.2);
    border-radius: 12px;
    background: rgba(8,8,10,0.45);
    min-height: 260px;
    padding: 26px;
    display: grid;
    place-items: center;
    text-align: center;
    align-content: center;
    gap: 10px;
  }

  .empty-state.small {
    min-height: 140px;
    padding: 18px;
  }

  @media (max-width: 1100px) {
    .messages-shell {
      width: calc(100vw - 32px);
    }

    .message-summary-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .messages-workspace,
    .timeline-card-preview,
    .context-action-card {
      grid-template-columns: 1fr;
    }

    .conversation-rows {
      max-height: 380px;
    }

    .thread-header {
      flex-direction: column;
    }
  }

  @media (max-width: 640px) {
    .messages-hero {
      align-items: flex-start;
      flex-direction: column;
    }

    .message-summary-row {
      grid-template-columns: 1fr;
    }

    .conversation-rows button {
      grid-template-columns: 38px minmax(0, 1fr);
    }

    .message-bubble {
      max-width: 92%;
    }

    .composer,
    .counter-row {
      grid-template-columns: 1fr;
    }
  }
`;
