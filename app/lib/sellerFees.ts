import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRewardEngineSnapshot } from "./rewardsEngine";

export type SellerFeeQuote = {
  sellerId: string;
  sellerLevel: number;
  rewardTier: string | null;
  sellerFeePercent: number;
  cardPrice: number;
  processingFee: number;
  platformFee: number;
  sellerPayoutAmount: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function cleanCurrency(value: number) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? roundCurrency(parsed) : 0;
}

export function calculateSellerFeeAmounts({
  cardPrice,
  sellerFeePercent,
  processingFee = 0,
}: {
  cardPrice: number;
  sellerFeePercent: number;
  processingFee?: number;
}) {
  const safeCardPrice = cleanCurrency(cardPrice);
  const safeProcessingFee = cleanCurrency(processingFee);
  const safeSellerFeePercent = Number(sellerFeePercent);

  if (!Number.isFinite(safeCardPrice) || safeCardPrice <= 0) {
    throw new Error("A valid card price is required to calculate seller fees.");
  }

  if (!Number.isFinite(safeSellerFeePercent) || safeSellerFeePercent < 0) {
    throw new Error("A valid seller fee percent is required.");
  }

  const platformFee = roundCurrency(safeCardPrice * (safeSellerFeePercent / 100));

  return {
    cardPrice: safeCardPrice,
    sellerFeePercent: safeSellerFeePercent,
    processingFee: safeProcessingFee,
    platformFee,
    sellerPayoutAmount: Math.max(
      roundCurrency(safeCardPrice - platformFee - safeProcessingFee),
      0,
    ),
  };
}

export async function getSellerFeeQuote({
  supabase,
  sellerId,
  cardPrice,
  processingFee = 0,
}: {
  supabase: SupabaseClient;
  sellerId: string;
  cardPrice: number;
  processingFee?: number;
}): Promise<SellerFeeQuote> {
  if (!sellerId) {
    throw new Error("Seller ID is required to calculate seller fees.");
  }

  const rewardSnapshot = await getRewardEngineSnapshot(supabase, sellerId);
  const sellerFeePercent = rewardSnapshot.economy.sellerFeePercent;

  if (sellerFeePercent === null || sellerFeePercent === undefined) {
    throw new Error("Seller fee is unavailable for this seller.");
  }

  const calculated = calculateSellerFeeAmounts({
    cardPrice,
    sellerFeePercent,
    processingFee,
  });

  return {
    sellerId,
    sellerLevel: rewardSnapshot.level,
    rewardTier: rewardSnapshot.economy.currentRank,
    ...calculated,
  };
}
