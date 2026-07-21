export const walletReasonPresets = [
  "Beta Bonus",
  "Promotion",
  "Referral Reward",
  "Contest Winner",
  "Support Credit",
  "Auction Adjustment",
  "Manual Correction",
  "Other",
] as const;

export type WalletReasonPreset = (typeof walletReasonPresets)[number];

const ledgerTypeLabels: Record<string, string> = {
  credit: "GRAIL Credit Reward",
  debit: "Credit Used",
  adjustment: "Wallet Adjustment",
  promotion: "Promotion",
  refund: "Refund",
  future_cashback: "GRAIL Credit Reward",
  future_referral: "Referral Reward",
  future_level_reward: "Level Reward",
  future_daily_reward: "Daily Reward",
  future_admin_grant: "Admin Credit",
};

export function getWalletTypeLabel(type?: string | null) {
  if (!type) {
    return "Wallet Activity";
  }

  return ledgerTypeLabels[type] || "Wallet Activity";
}

export function getWalletReasonLabel(reason?: string | null, fallbackType?: string | null) {
  return reason?.trim() || getWalletTypeLabel(fallbackType);
}

export function getAdminWalletVerb(amount: number) {
  if (amount > 0) {
    return "Granted by Admin";
  }

  return "Removed by Admin";
}
