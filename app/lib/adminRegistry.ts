export type AdminCategory =
  | "Marketplace"
  | "Economy"
  | "Wallet"
  | "Payments"
  | "Users"
  | "Listings"
  | "Orders"
  | "Auctions"
  | "Rewards"
  | "Support"
  | "Reports"
  | "Homepage"
  | "Settings"
  | "Future";

export type AdminRegistryItem = {
  id: string;
  title: string;
  icon: string;
  description: string;
  route: string;
  category: AdminCategory;
  sortOrder: number;
  enabled: boolean;
  dashboardVisible?: boolean;
};

export const adminRegistry: AdminRegistryItem[] = [
  {
    id: "admin-dashboard",
    title: "Admin Dashboard",
    icon: "AD",
    description: "Master control center for GRAIL operations.",
    route: "/admin",
    category: "Marketplace",
    sortOrder: 0,
    enabled: true,
    dashboardVisible: false,
  },
  {
    id: "economy",
    title: "GRAIL Control Center",
    icon: "MK",
    description: "Marketplace switches, events, economy status, and platform controls.",
    route: "/admin/economy",
    category: "Marketplace",
    sortOrder: 10,
    enabled: true,
  },
  {
    id: "rewards",
    title: "GRAIL Economy",
    icon: "RX",
    description: "Configure rank tiers, seller fees, reward percentages, and multipliers.",
    route: "/admin/rewards",
    category: "Rewards",
    sortOrder: 20,
    enabled: true,
  },
  {
    id: "wallet",
    title: "Admin Wallet",
    icon: "WL",
    description: "Grant, remove, adjust, and inspect GRAIL Credit wallets.",
    route: "/admin/wallet",
    category: "Wallet",
    sortOrder: 30,
    enabled: true,
  },
  {
    id: "payments",
    title: "Payments",
    icon: "PY",
    description: "Monitor orders, Stripe payment IDs, refunds, transfers, and payout errors.",
    route: "/admin/payments",
    category: "Payments",
    sortOrder: 40,
    enabled: true,
  },
  {
    id: "orders",
    title: "Orders",
    icon: "OR",
    description: "Review paid orders and fulfillment/payment status from the payments console.",
    route: "/admin/payments",
    category: "Orders",
    sortOrder: 45,
    enabled: true,
  },
  {
    id: "disputes",
    title: "Disputes",
    icon: "DS",
    description: "Review open disputes, evidence, admin notes, and resolution actions.",
    route: "/admin/disputes",
    category: "Support",
    sortOrder: 50,
    enabled: true,
  },
  {
    id: "support",
    title: "Support",
    icon: "SP",
    description: "Review contact support tickets and update support status.",
    route: "/admin/support",
    category: "Support",
    sortOrder: 60,
    enabled: true,
  },
  {
    id: "reports",
    title: "Reports",
    icon: "RP",
    description: "Review user-submitted listing reports and moderation notes.",
    route: "/admin/reports",
    category: "Reports",
    sortOrder: 70,
    enabled: true,
  },
  {
    id: "homepage",
    title: "Homepage",
    icon: "HP",
    description: "Curate homepage featured listings and public marketplace presentation.",
    route: "/admin/homepage",
    category: "Homepage",
    sortOrder: 80,
    enabled: true,
  },
  {
    id: "auctions",
    title: "Auctions",
    icon: "AU",
    description: "Monitor auction status, reserve commitment fees, winners, and admin cancels.",
    route: "/admin/auctions",
    category: "Auctions",
    sortOrder: 90,
    enabled: true,
  },
  {
    id: "users",
    title: "Users",
    icon: "US",
    description: "Dedicated user management console reserved for a future admin phase.",
    route: "/admin",
    category: "Users",
    sortOrder: 100,
    enabled: false,
  },
  {
    id: "listings",
    title: "Listings",
    icon: "LS",
    description: "Dedicated listing moderation console reserved for a future admin phase.",
    route: "/admin",
    category: "Listings",
    sortOrder: 110,
    enabled: false,
  },
  {
    id: "settings",
    title: "Settings",
    icon: "ST",
    description: "Platform-wide settings live in the GRAIL Control Center for now.",
    route: "/admin/economy",
    category: "Settings",
    sortOrder: 120,
    enabled: true,
  },
  {
    id: "trust",
    title: "Trust",
    icon: "TR",
    description: "Future trust, safety, and verification controls.",
    route: "/admin",
    category: "Future",
    sortOrder: 200,
    enabled: false,
  },
  {
    id: "grail-pass",
    title: "GRAIL Pass",
    icon: "GP",
    description: "Future subscription and member benefit controls.",
    route: "/admin",
    category: "Future",
    sortOrder: 210,
    enabled: false,
  },
  {
    id: "treasure-chests",
    title: "Treasure Chests",
    icon: "TC",
    description: "Future reward drop and treasure chest controls.",
    route: "/admin",
    category: "Future",
    sortOrder: 220,
    enabled: false,
  },
  {
    id: "weekly-challenges",
    title: "Weekly Challenges",
    icon: "WC",
    description: "Future weekly challenge configuration.",
    route: "/admin",
    category: "Future",
    sortOrder: 230,
    enabled: false,
  },
  {
    id: "referrals",
    title: "Referrals",
    icon: "RF",
    description: "Future referral reward controls.",
    route: "/admin",
    category: "Future",
    sortOrder: 240,
    enabled: false,
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: "AN",
    description: "Future marketplace analytics console.",
    route: "/admin",
    category: "Future",
    sortOrder: 250,
    enabled: false,
  },
];

export function getAdminDashboardItems() {
  return adminRegistry
    .filter((item) => item.dashboardVisible !== false)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getAdminPageByRoute(route: string) {
  return adminRegistry.find((item) => item.route === route && item.enabled) || null;
}
