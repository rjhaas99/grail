export type ListingTag = "Graded" | "Raw" | "Hot" | "Grail";
export type CardCategory = "Sports" | "TCG";
export type OfferStatus =
  | "Pending"
  | "Countered"
  | "Accepted"
  | "Declined"
  | "Withdrawn";
export type OrderStatus = "Processing" | "Shipped" | "Delivered";

export type MockSeller = {
  slug: string;
  name: string;
  initials: string;
  level: string;
  rewardsBadge: string;
  completedSales: number;
  activeListings: number;
  responseTime: string;
  shipSpeed: string;
  rating: string;
  reviews: number;
  joinedDate: string;
  location: string;
  bio: string;
  collectionValue: number;
  avgListingPrice: number;
  fastShippingStreak: string;
  responseScore: string;
  cancellationRate: string;
  sellerTags: string[];
  levelProgress: number;
  buyerRating: string;
  priceOffset: number;
  route: string;
};

export type MockListing = {
  id: string;
  route: string;
  href: string;
  title: string;
  category: CardCategory;
  conditionDisplay: string;
  condition: string;
  subtitle: string;
  meta: string;
  sellerSlug: string;
  sellerName: string;
  seller: string;
  sellerLevel: string;
  sellerRoute: string;
  sellerHref: string;
  price: number;
  priceDisplay: string;
  askingPrice: number;
  marketValue: number;
  minimumOffer: number;
  minOffer: number;
  watchCount: number;
  views: number;
  viewCount: number;
  listedOrder: number;
  listedDate: string;
  tags: ListingTag[];
  tag: ListingTag;
  isGraded: boolean;
  isRaw: boolean;
  isHot: boolean;
  isGrail: boolean;
  accent: string;
  artworkTone: string;
  cardDetailRoute: string;
  sellerCollectionRoute: string;
  details: {
    year: string;
    set: string;
    cardNumber: string;
    subject: string;
    grader: string;
    grade: string;
    certNumber: string;
    notes: string;
  };
  priceHistory: {
    thirtyDay: string;
    ninetyDay: string;
    lastSale: number;
    averageSale: number;
    chartPoints: number[];
  };
  overview: string;
};

export type MockOffer = {
  id: string;
  cardId: string;
  cardTitle: string;
  cardHref: string;
  cardRoute: string;
  sellerSlug?: string;
  sellerName?: string;
  seller?: string;
  buyerName?: string;
  buyer?: string;
  offerAmount: number;
  amount: number;
  askingPrice: number;
  status: OfferStatus;
  timeLeft: string;
  messageRoute: string;
};

export type MockConversation = {
  id: string;
  participantName: string;
  participantRole: string;
  person: string;
  badge: string;
  cardId: string;
  cardTitle: string;
  cardRoute: string;
  cardHref: string;
  price: number;
  currentOffer?: number;
  snippet: string;
  lastSnippet: string;
  timestamp: string;
  unread?: boolean;
  accent: string;
  messages: {
    id: string;
    sender: "buyer" | "seller";
    body: string;
    time: string;
  }[];
  offer?: {
    amount: number;
    status: "Pending" | "Accepted" | "Countered" | "Declined";
  };
};

export type MockOrder = {
  id: string;
  cardId: string;
  cardTitle: string;
  card: string;
  sellerName: string;
  seller: string;
  buyerName: string;
  buyer: string;
  total: number;
  totalDisplay: string;
  status: OrderStatus;
  date: string;
  shipBy: string;
  cardRoute: string;
  href: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export const mockSellers: MockSeller[] = [
  {
    slug: "vault-runner",
    name: "VaultRunner",
    initials: "VR",
    level: "Level 4 Seller",
    rewardsBadge: "Top Closer",
    completedSales: 142,
    activeListings: 24,
    responseTime: "Under 1 hour",
    shipSpeed: "1 business day",
    rating: "4.9 / 5 from 86 reviews",
    reviews: 86,
    joinedDate: "March 2024",
    location: "United States",
    bio: "Curated fictional slabs, raw cards, and premium collection pieces for serious GRAIL buyers.",
    collectionValue: 128450,
    avgListingPrice: 5352,
    fastShippingStreak: "38 orders",
    responseScore: "98%",
    cancellationRate: "0.6%",
    sellerTags: ["Top Closer", "Trusted", "Fast Shipper"],
    levelProgress: 76,
    buyerRating: "4.9",
    priceOffset: 0,
    route: "/collections/vault-runner",
  },
  {
    slug: "card-forge",
    name: "CardForge",
    initials: "CF",
    level: "Level 3 Seller",
    rewardsBadge: "Fast Shipper",
    completedSales: 98,
    activeListings: 18,
    responseTime: "2 hours",
    shipSpeed: "1-2 business days",
    rating: "4.8 / 5 from 54 reviews",
    reviews: 54,
    joinedDate: "June 2024",
    location: "United States",
    bio: "A focused card collection with clean raw listings and graded fictional showcase cards.",
    collectionValue: 87900,
    avgListingPrice: 4883,
    fastShippingStreak: "24 orders",
    responseScore: "95%",
    cancellationRate: "1.1%",
    sellerTags: ["Fast Shipper", "Trusted"],
    levelProgress: 62,
    buyerRating: "4.8",
    priceOffset: -40,
    route: "/collections/card-forge",
  },
  {
    slug: "slab-street",
    name: "SlabStreet",
    initials: "SS",
    level: "Level 3 Seller",
    rewardsBadge: "Trusted",
    completedSales: 76,
    activeListings: 15,
    responseTime: "Under 3 hours",
    shipSpeed: "2 business days",
    rating: "4.7 / 5 from 39 reviews",
    reviews: 39,
    joinedDate: "August 2024",
    location: "United States",
    bio: "Trusted seller specializing in clean graded inventory and carefully photographed raw cards.",
    collectionValue: 64250,
    avgListingPrice: 4283,
    fastShippingStreak: "19 orders",
    responseScore: "93%",
    cancellationRate: "1.4%",
    sellerTags: ["Trusted"],
    levelProgress: 54,
    buyerRating: "4.7",
    priceOffset: -75,
    route: "/collections/slab-street",
  },
  {
    slug: "pack-pilot",
    name: "PackPilot",
    initials: "PP",
    level: "Level 2 Seller",
    rewardsBadge: "Rising Seller",
    completedSales: 41,
    activeListings: 12,
    responseTime: "Same day",
    shipSpeed: "2 business days",
    rating: "4.6 / 5 from 21 reviews",
    reviews: 21,
    joinedDate: "January 2025",
    location: "United States",
    bio: "A growing storefront with value-focused fictional listings and fast communication.",
    collectionValue: 42700,
    avgListingPrice: 3558,
    fastShippingStreak: "11 orders",
    responseScore: "91%",
    cancellationRate: "1.8%",
    sellerTags: ["Rising Seller"],
    levelProgress: 44,
    buyerRating: "4.6",
    priceOffset: -110,
    route: "/collections/pack-pilot",
  },
  {
    slug: "rookie-room",
    name: "RookieRoom",
    initials: "RR",
    level: "Level 2 Seller",
    rewardsBadge: "Fast Shipper",
    completedSales: 63,
    activeListings: 14,
    responseTime: "Under 4 hours",
    shipSpeed: "1-2 business days",
    rating: "4.8 / 5 from 33 reviews",
    reviews: 33,
    joinedDate: "November 2024",
    location: "United States",
    bio: "Modern fictional rookie-style cards, TCG pieces, and watch-list favorites.",
    collectionValue: 52180,
    avgListingPrice: 3727,
    fastShippingStreak: "16 orders",
    responseScore: "94%",
    cancellationRate: "1.0%",
    sellerTags: ["Fast Shipper"],
    levelProgress: 49,
    buyerRating: "4.8",
    priceOffset: -25,
    route: "/collections/rookie-room",
  },
  {
    slug: "holo-house",
    name: "HoloHouse",
    initials: "HH",
    level: "Level 3 Seller",
    rewardsBadge: "Trusted",
    completedSales: 87,
    activeListings: 16,
    responseTime: "Under 2 hours",
    shipSpeed: "1 business day",
    rating: "4.9 / 5 from 47 reviews",
    reviews: 47,
    joinedDate: "May 2024",
    location: "United States",
    bio: "Premium fictional holo cards and slabs with a clean seller history.",
    collectionValue: 78420,
    avgListingPrice: 4901,
    fastShippingStreak: "29 orders",
    responseScore: "97%",
    cancellationRate: "0.8%",
    sellerTags: ["Trusted", "Fast Shipper"],
    levelProgress: 68,
    buyerRating: "4.9",
    priceOffset: 35,
    route: "/collections/holo-house",
  },
  {
    slug: "grade-lane",
    name: "GradeLane",
    initials: "GL",
    level: "Level 4 Seller",
    rewardsBadge: "Top Closer",
    completedSales: 119,
    activeListings: 20,
    responseTime: "Under 1 hour",
    shipSpeed: "1 business day",
    rating: "5.0 / 5 from 72 reviews",
    reviews: 72,
    joinedDate: "February 2024",
    location: "United States",
    bio: "High-activity fictional graded listings with strong buyer trust and seller rewards.",
    collectionValue: 101300,
    avgListingPrice: 5065,
    fastShippingStreak: "42 orders",
    responseScore: "99%",
    cancellationRate: "0.4%",
    sellerTags: ["Top Closer", "Trusted"],
    levelProgress: 82,
    buyerRating: "5.0",
    priceOffset: 60,
    route: "/collections/grade-lane",
  },
  {
    slug: "collector-corner",
    name: "CollectorCorner",
    initials: "CC",
    level: "Level 1 Seller",
    rewardsBadge: "Rising Seller",
    completedSales: 24,
    activeListings: 9,
    responseTime: "Same day",
    shipSpeed: "2-3 business days",
    rating: "4.5 / 5 from 12 reviews",
    reviews: 12,
    joinedDate: "April 2025",
    location: "United States",
    bio: "Entry-friendly fictional cards with clear listings and buyer-first communication.",
    collectionValue: 18450,
    avgListingPrice: 2050,
    fastShippingStreak: "7 orders",
    responseScore: "88%",
    cancellationRate: "2.4%",
    sellerTags: ["Rising Seller"],
    levelProgress: 28,
    buyerRating: "4.5",
    priceOffset: -135,
    route: "/collections/collector-corner",
  },
];

const sellerBySlug = new Map(mockSellers.map((seller) => [seller.slug, seller]));

const listingSeeds = [
  {
    id: "browse-1",
    title: "Crimson Court Rookie",
    category: "Sports" as const,
    conditionDisplay: "PSA 10",
    sellerSlug: "vault-runner",
    price: 1240,
    marketValue: 1320,
    minimumOffer: 1120,
    watchCount: 184,
    views: 1240,
    listedOrder: 4,
    listedDate: "Jun 24, 2026",
    isGrail: true,
    accent: "#8f1d2c",
    artworkTone: "ruby court",
    details: {
      year: "2026",
      set: "Crimson Court Archive",
      cardNumber: "CC-01",
      subject: "Rookie Guard",
      grader: "PSA",
      grade: "10",
      certNumber: "Mock-184204",
      notes: "Clean slab, sharp fictional card art, no visible surface notes.",
    },
    priceHistory: {
      thirtyDay: "+4.8%",
      ninetyDay: "+12.3%",
      lastSale: 1180,
      averageSale: 1275,
      chartPoints: [1180, 1215, 1195, 1240, 1265, 1250, 1320],
    },
    overview:
      "A premium fictional sports-card grail with strong mock market value, elevated watch activity, and a clean graded presentation.",
  },
  {
    id: "browse-2",
    title: "Silver Horizon Striker",
    category: "Sports" as const,
    conditionDisplay: "PSA 9",
    sellerSlug: "card-forge",
    price: 680,
    marketValue: 710,
    minimumOffer: 610,
    watchCount: 96,
    views: 680,
    listedOrder: 8,
    listedDate: "Jun 28, 2026",
    isGrail: false,
    accent: "#334155",
    artworkTone: "silver field",
    details: {
      year: "2025",
      set: "Silver Horizon Series",
      cardNumber: "SH-17",
      subject: "Field Striker",
      grader: "PSA",
      grade: "9",
      certNumber: "Mock-680911",
      notes: "Well-centered slab with light fictional edge notation.",
    },
    priceHistory: {
      thirtyDay: "+2.1%",
      ninetyDay: "+6.4%",
      lastSale: 665,
      averageSale: 704,
      chartPoints: [642, 655, 648, 670, 676, 690, 710],
    },
    overview:
      "A clean graded sports listing with steady mock demand and a seller known for fast fulfillment.",
  },
  {
    id: "browse-3",
    title: "Midnight Arc Holo",
    category: "TCG" as const,
    conditionDisplay: "Mint",
    sellerSlug: "slab-street",
    price: 395,
    marketValue: 380,
    minimumOffer: 350,
    watchCount: 72,
    views: 420,
    listedOrder: 2,
    listedDate: "Jun 22, 2026",
    isGrail: false,
    accent: "#0f766e",
    artworkTone: "teal holo",
    details: {
      year: "2026",
      set: "Midnight Arc",
      cardNumber: "MA-H12",
      subject: "Arc Guardian",
      grader: "Raw",
      grade: "Mint",
      certNumber: "Not graded",
      notes: "Raw fictional holo card with clean corners and bright surface.",
    },
    priceHistory: {
      thirtyDay: "+1.6%",
      ninetyDay: "+5.9%",
      lastSale: 372,
      averageSale: 388,
      chartPoints: [355, 368, 360, 376, 382, 374, 380],
    },
    overview:
      "A raw TCG mock listing with a dark holo-style presentation and strong collector appeal.",
  },
  {
    id: "browse-4",
    title: "Obsidian Field Captain",
    category: "Sports" as const,
    conditionDisplay: "SGC 8",
    sellerSlug: "pack-pilot",
    price: 520,
    marketValue: 560,
    minimumOffer: 470,
    watchCount: 166,
    views: 980,
    listedOrder: 7,
    listedDate: "Jun 27, 2026",
    isGrail: false,
    accent: "#1e3a8a",
    artworkTone: "obsidian field",
    details: {
      year: "2024",
      set: "Obsidian Field",
      cardNumber: "OF-09",
      subject: "Field Captain",
      grader: "SGC",
      grade: "8",
      certNumber: "Mock-520884",
      notes: "Strong eye appeal with mock corner wear reflected in grade.",
    },
    priceHistory: {
      thirtyDay: "+6.2%",
      ninetyDay: "+14.8%",
      lastSale: 505,
      averageSale: 548,
      chartPoints: [470, 482, 510, 498, 535, 542, 560],
    },
    overview:
      "A high-watch sports listing with above-average mock traffic and a below-market asking price.",
  },
  {
    id: "browse-5",
    title: "Aurora Strike Prism",
    category: "TCG" as const,
    conditionDisplay: "Raw Near Mint",
    sellerSlug: "rookie-room",
    price: 185,
    marketValue: 210,
    minimumOffer: 165,
    watchCount: 148,
    views: 790,
    listedOrder: 6,
    listedDate: "Jun 26, 2026",
    isGrail: false,
    accent: "#7c3aed",
    artworkTone: "aurora prism",
    details: {
      year: "2025",
      set: "Aurora Strike",
      cardNumber: "AS-P7",
      subject: "Prism Warden",
      grader: "Raw",
      grade: "Near Mint",
      certNumber: "Not graded",
      notes: "Raw fictional prism card with minor handling notes.",
    },
    priceHistory: {
      thirtyDay: "+3.4%",
      ninetyDay: "+8.9%",
      lastSale: 176,
      averageSale: 202,
      chartPoints: [176, 184, 181, 194, 198, 204, 210],
    },
    overview:
      "A raw TCG prism-style card priced below mock market with solid watch activity.",
  },
  {
    id: "browse-6",
    title: "Platinum Rookie Crest",
    category: "Sports" as const,
    conditionDisplay: "PSA 8",
    sellerSlug: "holo-house",
    price: 910,
    marketValue: 940,
    minimumOffer: 825,
    watchCount: 88,
    views: 610,
    listedOrder: 3,
    listedDate: "Jun 23, 2026",
    isGrail: false,
    accent: "#475569",
    artworkTone: "platinum crest",
    details: {
      year: "2024",
      set: "Platinum Rookie Crest",
      cardNumber: "PRC-22",
      subject: "Rookie Crest",
      grader: "PSA",
      grade: "8",
      certNumber: "Mock-910318",
      notes: "Attractive graded fictional card with light centering note.",
    },
    priceHistory: {
      thirtyDay: "+2.9%",
      ninetyDay: "+7.6%",
      lastSale: 895,
      averageSale: 932,
      chartPoints: [872, 888, 900, 914, 906, 928, 940],
    },
    overview:
      "A graded sports-card mock listing with stable price history and trusted seller history.",
  },
  {
    id: "browse-7",
    title: "Emerald Archive Guardian",
    category: "TCG" as const,
    conditionDisplay: "BGS 9.5",
    sellerSlug: "grade-lane",
    price: 760,
    marketValue: 820,
    minimumOffer: 695,
    watchCount: 205,
    views: 1510,
    listedOrder: 5,
    listedDate: "Jun 25, 2026",
    isGrail: false,
    accent: "#047857",
    artworkTone: "emerald archive",
    details: {
      year: "2026",
      set: "Emerald Archive",
      cardNumber: "EA-G4",
      subject: "Archive Guardian",
      grader: "BGS",
      grade: "9.5",
      certNumber: "Mock-760551",
      notes: "Premium fictional graded TCG card with strong mock demand.",
    },
    priceHistory: {
      thirtyDay: "+7.8%",
      ninetyDay: "+16.1%",
      lastSale: 735,
      averageSale: 805,
      chartPoints: [692, 720, 704, 748, 774, 790, 820],
    },
    overview:
      "A hot graded TCG listing with the highest mock watch count in this Browse set.",
  },
  {
    id: "browse-8",
    title: "Sapphire Prospect Vault",
    category: "Sports" as const,
    conditionDisplay: "Raw Mint",
    sellerSlug: "collector-corner",
    price: 145,
    marketValue: 155,
    minimumOffer: 125,
    watchCount: 43,
    views: 280,
    listedOrder: 1,
    listedDate: "Jun 21, 2026",
    isGrail: false,
    accent: "#1d4ed8",
    artworkTone: "sapphire vault",
    details: {
      year: "2025",
      set: "Sapphire Prospect Vault",
      cardNumber: "SPV-31",
      subject: "Prospect Vault",
      grader: "Raw",
      grade: "Mint",
      certNumber: "Not graded",
      notes: "Raw fictional sports card with clean surface and corners.",
    },
    priceHistory: {
      thirtyDay: "+1.2%",
      ninetyDay: "+3.7%",
      lastSale: 138,
      averageSale: 151,
      chartPoints: [132, 139, 141, 138, 146, 149, 155],
    },
    overview:
      "A lower-price raw sports mock listing suited for collectors browsing entry-level cards.",
  },
];

export function getListingTag(listing: {
  conditionDisplay?: string;
  condition?: string;
  marketValue: number;
  watchCount: number;
  views?: number;
  viewCount?: number;
  isGrail?: boolean;
  isHot?: boolean;
}): ListingTag {
  if (listing.isGrail || listing.marketValue >= 1200) {
    return "Grail";
  }

  const viewCount = listing.views ?? listing.viewCount ?? 0;

  if (listing.isHot || listing.watchCount >= 150 || viewCount >= 900) {
    return "Hot";
  }

  const condition = (listing.conditionDisplay ?? listing.condition ?? "").toLowerCase();

  return condition.includes("raw") ||
    condition.includes("near mint") ||
    condition === "mint"
    ? "Raw"
    : "Graded";
}

export const mockListings: MockListing[] = listingSeeds.map((seed) => {
  const seller = sellerBySlug.get(seed.sellerSlug);

  if (!seller) {
    throw new Error(`Missing mock seller for ${seed.sellerSlug}`);
  }

  const base = {
    ...seed,
    route: `/cards/${seed.id}`,
    href: `/cards/${seed.id}`,
    condition: seed.conditionDisplay,
    subtitle: `${seed.category}: ${seed.conditionDisplay}`,
    meta: `${seed.category}: ${seed.conditionDisplay}`,
    sellerName: seller.name,
    seller: seller.name,
    sellerLevel: seller.level,
    sellerRoute: seller.route,
    sellerHref: seller.route,
    priceDisplay: formatCurrency(seed.price),
    askingPrice: seed.price,
    minOffer: seed.minimumOffer,
    viewCount: seed.views,
    isRaw:
      seed.conditionDisplay.toLowerCase().includes("raw") ||
      seed.conditionDisplay.toLowerCase() === "mint" ||
      seed.conditionDisplay.toLowerCase().includes("near mint"),
    isGraded: !(
      seed.conditionDisplay.toLowerCase().includes("raw") ||
      seed.conditionDisplay.toLowerCase() === "mint" ||
      seed.conditionDisplay.toLowerCase().includes("near mint")
    ),
    isHot: seed.watchCount >= 150 || seed.views >= 900,
    cardDetailRoute: `/cards/${seed.id}`,
    sellerCollectionRoute: seller.route,
  };
  const tag = getListingTag(base);

  return {
    ...base,
    tag,
    tags: Array.from(
      new Set([
        base.isGraded ? "Graded" : "Raw",
        base.isHot ? "Hot" : null,
        base.isGrail || tag === "Grail" ? "Grail" : null,
      ].filter(Boolean) as ListingTag[]),
    ),
  };
});

export const mockMarketData = {
  snapshot: {
    totalListings: 248,
    avgSalePrice: 412,
    newToday: 31,
    trendingCategory: "Graded Rookies",
  },
  grailMarketIndex: {
    label: "Sports + TCG Market",
    value: "1,248.6",
    dailyChange: "+2.4% today",
    chartPoints: [984, 1028, 1002, 1080, 1058, 1134, 1106, 1188, 1160, 1248.6],
  },
};

export const mockFeaturedSellers = mockSellers.slice(0, 4).map((seller) => ({
  name: seller.name,
  level: seller.level,
  sales: `${seller.completedSales} sales`,
  completedSales: seller.completedSales,
  badge: seller.rewardsBadge,
  slug: seller.slug,
  route: seller.route,
}));

export const mockSentOffers: MockOffer[] = [
  {
    id: "sent-1",
    cardId: "browse-1",
    cardTitle: "Crimson Court Rookie",
    cardHref: "/cards/browse-1",
    cardRoute: "/cards/browse-1",
    sellerSlug: "vault-runner",
    sellerName: "VaultRunner",
    seller: "VaultRunner",
    offerAmount: 1160,
    amount: 1160,
    askingPrice: 1240,
    status: "Pending",
    timeLeft: "18h left",
    messageRoute: "/messages",
  },
  {
    id: "sent-2",
    cardId: "browse-7",
    cardTitle: "Emerald Archive Guardian",
    cardHref: "/cards/browse-7",
    cardRoute: "/cards/browse-7",
    sellerSlug: "grade-lane",
    sellerName: "GradeLane",
    seller: "GradeLane",
    offerAmount: 710,
    amount: 710,
    askingPrice: 760,
    status: "Countered",
    timeLeft: "9h left",
    messageRoute: "/messages",
  },
  {
    id: "sent-3",
    cardId: "browse-3",
    cardTitle: "Midnight Arc Holo",
    cardHref: "/cards/browse-3",
    cardRoute: "/cards/browse-3",
    sellerSlug: "slab-street",
    sellerName: "SlabStreet",
    seller: "SlabStreet",
    offerAmount: 380,
    amount: 380,
    askingPrice: 395,
    status: "Accepted",
    timeLeft: "Complete",
    messageRoute: "/messages",
  },
  {
    id: "sent-4",
    cardId: "browse-5",
    cardTitle: "Aurora Strike Prism",
    cardHref: "/cards/browse-5",
    cardRoute: "/cards/browse-5",
    sellerSlug: "rookie-room",
    sellerName: "RookieRoom",
    seller: "RookieRoom",
    offerAmount: 150,
    amount: 150,
    askingPrice: 185,
    status: "Declined",
    timeLeft: "Expired",
    messageRoute: "/messages",
  },
];

export const mockReceivedOffers: MockOffer[] = [
  {
    id: "received-1",
    cardId: "browse-4",
    cardTitle: "Obsidian Field Captain",
    cardHref: "/cards/browse-4",
    cardRoute: "/cards/browse-4",
    buyerName: "MasonVault",
    buyer: "MasonVault",
    offerAmount: 485,
    amount: 485,
    askingPrice: 520,
    status: "Pending",
    timeLeft: "20h left",
    messageRoute: "/messages",
  },
  {
    id: "received-2",
    cardId: "browse-6",
    cardTitle: "Platinum Rookie Crest",
    cardHref: "/cards/browse-6",
    cardRoute: "/cards/browse-6",
    buyerName: "IndexBuyer",
    buyer: "IndexBuyer",
    offerAmount: 860,
    amount: 860,
    askingPrice: 910,
    status: "Pending",
    timeLeft: "14h left",
    messageRoute: "/messages",
  },
  {
    id: "received-3",
    cardId: "browse-8",
    cardTitle: "Sapphire Prospect Vault",
    cardHref: "/cards/browse-8",
    cardRoute: "/cards/browse-8",
    buyerName: "HoloStack",
    buyer: "HoloStack",
    offerAmount: 130,
    amount: 130,
    askingPrice: 145,
    status: "Countered",
    timeLeft: "8h left",
    messageRoute: "/messages",
  },
];

export const mockConversations: MockConversation[] = [
  {
    id: "vault-runner",
    participantName: "VaultRunner",
    participantRole: "Level 4 Seller",
    person: "VaultRunner",
    badge: "Level 4 Seller",
    cardId: "browse-1",
    cardTitle: "Crimson Court Rookie",
    cardRoute: "/cards/browse-1",
    cardHref: "/cards/browse-1",
    price: 1240,
    currentOffer: 1160,
    snippet: "I can ship this tomorrow with tracking.",
    lastSnippet: "I can ship this tomorrow with tracking.",
    timestamp: "2m",
    unread: true,
    accent: "#8f1d2c",
    messages: [
      {
        id: "m1",
        sender: "buyer",
        body: "Is the slab clean with no scratches?",
        time: "10:12 AM",
      },
      {
        id: "m2",
        sender: "seller",
        body: "Yes. The front and back are clean, and I can add extra photos before checkout.",
        time: "10:14 AM",
      },
      {
        id: "m3",
        sender: "seller",
        body: "I can ship this tomorrow with tracking.",
        time: "10:16 AM",
      },
    ],
    offer: {
      amount: 1160,
      status: "Pending",
    },
  },
  {
    id: "card-forge",
    participantName: "CardForge",
    participantRole: "Level 3 Seller",
    person: "CardForge",
    badge: "Level 3 Seller",
    cardId: "browse-2",
    cardTitle: "Silver Horizon Striker",
    cardRoute: "/cards/browse-2",
    cardHref: "/cards/browse-2",
    price: 680,
    snippet: "The card is ready to ship.",
    lastSnippet: "The card is ready to ship.",
    timestamp: "18m",
    accent: "#334155",
    messages: [
      {
        id: "m1",
        sender: "seller",
        body: "The card is ready to ship.",
        time: "9:58 AM",
      },
    ],
  },
  {
    id: "slab-street",
    participantName: "SlabStreet",
    participantRole: "Trusted Seller",
    person: "SlabStreet",
    badge: "Trusted Seller",
    cardId: "browse-4",
    cardTitle: "Obsidian Field Captain",
    cardRoute: "/cards/browse-4",
    cardHref: "/cards/browse-4",
    price: 520,
    currentOffer: 485,
    snippet: "Offer is pending review.",
    lastSnippet: "Offer is pending review.",
    timestamp: "1h",
    unread: true,
    accent: "#1e3a8a",
    messages: [
      {
        id: "m1",
        sender: "buyer",
        body: "Sending an offer based on recent comps.",
        time: "8:42 AM",
      },
    ],
    offer: {
      amount: 485,
      status: "Pending",
    },
  },
  {
    id: "pack-pilot",
    participantName: "PackPilot",
    participantRole: "Level 2 Seller",
    person: "PackPilot",
    badge: "Level 2 Seller",
    cardId: "browse-5",
    cardTitle: "Shipping question",
    cardRoute: "/cards/browse-5",
    cardHref: "/cards/browse-5",
    price: 185,
    snippet: "Do you combine shipping on multiple cards?",
    lastSnippet: "Do you combine shipping on multiple cards?",
    timestamp: "3h",
    accent: "#7c3aed",
    messages: [
      {
        id: "m1",
        sender: "buyer",
        body: "Do you combine shipping on multiple cards?",
        time: "7:10 AM",
      },
    ],
  },
];

export const mockOrders: MockOrder[] = [
  {
    id: "GRAIL-1048",
    cardId: "browse-1",
    cardTitle: "Crimson Court Rookie",
    card: "Crimson Court Rookie",
    sellerName: "VaultRunner",
    seller: "VaultRunner",
    buyerName: "VaultBuyer",
    buyer: "VaultBuyer",
    total: 1355,
    totalDisplay: "$1,355",
    status: "Processing",
    date: "Jun 28, 2026",
    shipBy: "Jun 30",
    cardRoute: "/cards/browse-1",
    href: "/cards/browse-1",
  },
  {
    id: "GRAIL-1039",
    cardId: "browse-3",
    cardTitle: "Midnight Arc Holo",
    card: "Midnight Arc Holo",
    sellerName: "SlabStreet",
    seller: "SlabStreet",
    buyerName: "CardIndex",
    buyer: "CardIndex",
    total: 438,
    totalDisplay: "$438",
    status: "Shipped",
    date: "Jun 26, 2026",
    shipBy: "Jul 1",
    cardRoute: "/cards/browse-3",
    href: "/cards/browse-3",
  },
  {
    id: "GRAIL-1027",
    cardId: "browse-8",
    cardTitle: "Sapphire Prospect Vault",
    card: "Sapphire Prospect Vault",
    sellerName: "CollectorCorner",
    seller: "CollectorCorner",
    buyerName: "RookieIndex",
    buyer: "RookieIndex",
    total: 166,
    totalDisplay: "$166",
    status: "Delivered",
    date: "Jun 18, 2026",
    shipBy: "Jun 20",
    cardRoute: "/cards/browse-8",
    href: "/cards/browse-8",
  },
];

export const mockSellerDashboardData = {
  stats: {
    activeListings: "24",
    pendingOffers: "8",
    ordersThisMonth: "17",
    totalEarnings: "$28,450",
    sellerLevel: "Level 4",
    responseRate: "98%",
  },
  activeListings: mockListings
    .filter((listing) =>
      ["browse-1", "browse-7", "browse-6"].includes(listing.id),
    )
    .map((listing) => ({
      card: listing.title,
      href: listing.route,
      price: formatCurrency(listing.price),
      market: formatCurrency(listing.marketValue),
      watches: listing.watchCount,
      views: listing.views,
      status: "Active",
    })),
  incomingOffers: mockReceivedOffers.map((offer) => ({
    id: offer.id,
    buyer: offer.buyerName ?? "Buyer",
    card: offer.cardTitle,
    offer: formatCurrency(offer.offerAmount),
    asking: formatCurrency(offer.askingPrice),
    status: offer.status === "Withdrawn" ? "Declined" : offer.status,
  })),
  recentOrders: mockOrders.slice(0, 2).map((order) => ({
    id: order.id,
    card: order.cardTitle,
    buyer: order.buyerName,
    total: order.totalDisplay,
    status: order.status === "Delivered" ? "Shipped" : order.status,
    shipBy: order.shipBy,
  })),
  rewards: {
    currentLevel: "Level 4 Seller",
    progressToNext: 76,
    completedSales: 142,
    fastShippingStreak: "38 orders",
    responseScore: "98%",
    buyerRating: "4.9",
  },
};

export const sellerRewardLevels = Array.from({ length: 10 }, (_, index) => {
  const level = index + 1;

  return {
    level,
    title: `Level ${level} Seller`,
    requirements:
      level === 1
        ? "Create accurate listings and complete your first sales."
        : `${level * 15}+ completed sales, strong response time, and consistent shipping.`,
    rewards:
      level < 4
        ? "Trust badge progress and basic seller insights."
        : level < 8
          ? "Better Browse placement, Featured Seller eligibility, and deeper seller insights."
          : "Highest visibility boosts, stronger trust badge, and early access to seller tools.",
  };
});

export function getMockListingById(id: string) {
  return mockListings.find((listing) => listing.id === id);
}

export function getMockSellerBySlug(slug: string) {
  return mockSellers.find((seller) => seller.slug === slug);
}

export function buildMockSellerListings(seller: MockSeller) {
  return mockListings
    .map((listing, index) => ({
      ...listing,
      price: Math.max(75, listing.price + seller.priceOffset + index * 12),
      askingPrice: Math.max(75, listing.askingPrice + seller.priceOffset + index * 12),
      marketValue: Math.max(
        95,
        listing.marketValue + seller.priceOffset + index * 10,
      ),
      watchCount: Math.max(
        18,
        listing.watchCount + Math.round(seller.levelProgress / 6) - index * 2,
      ),
    }))
    .sort((first, second) => second.listedOrder - first.listedOrder);
}
