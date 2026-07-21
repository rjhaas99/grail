import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const walletLedgerTypes = [
  "credit",
  "debit",
  "adjustment",
  "promotion",
  "refund",
  "future_cashback",
  "future_referral",
  "future_level_reward",
  "future_daily_reward",
  "future_admin_grant",
] as const;

export type WalletLedgerType = (typeof walletLedgerTypes)[number];

export type WalletSummary = {
  userId: string;
  availableCredit: number;
  pendingCredit: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string | null;
};

export type WalletLedgerEntry = {
  id: string;
  userId: string;
  type: WalletLedgerType;
  amount: number;
  balanceAfter: number;
  title: string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey?: string | null;
  createdAt: string | null;
};

type WalletRow = {
  user_id: string;
  available_credit: number | string | null;
  pending_credit: number | string | null;
  lifetime_earned: number | string | null;
  lifetime_redeemed: number | string | null;
  updated_at: string | null;
};

type WalletLedgerRow = {
  id: string;
  user_id: string;
  type: string | null;
  amount: number | string | null;
  balance_after: number | string | null;
  title: string | null;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  idempotency_key?: string | null;
  created_at: string | null;
};

type WalletTransactionRpcRow = {
  wallet_user_id: string;
  available_credit: number | string | null;
  pending_credit: number | string | null;
  lifetime_earned: number | string | null;
  lifetime_redeemed: number | string | null;
  wallet_updated_at: string | null;
  ledger_id: string;
  ledger_type: string | null;
  ledger_amount: number | string | null;
  ledger_balance_after: number | string | null;
  ledger_title: string | null;
  ledger_description: string | null;
  ledger_reference_type: string | null;
  ledger_reference_id: string | null;
  ledger_idempotency_key: string | null;
  ledger_created_at: string | null;
  already_applied: boolean | null;
};

type LedgerInput = {
  userId: string;
  type: WalletLedgerType;
  amount: number;
  title: string;
  description?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
};

type CreditInput = Omit<LedgerInput, "type" | "amount"> & {
  amount: number;
  type?: WalletLedgerType;
};

type RemoveCreditInput = Omit<LedgerInput, "type" | "amount"> & {
  amount: number;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function fromCents(value: number) {
  return value / 100;
}

function mapWallet(row: WalletRow): WalletSummary {
  return {
    userId: row.user_id,
    availableCredit: toNumber(row.available_credit),
    pendingCredit: toNumber(row.pending_credit),
    lifetimeEarned: toNumber(row.lifetime_earned),
    lifetimeRedeemed: toNumber(row.lifetime_redeemed),
    updatedAt: row.updated_at,
  };
}

function mapLedger(row: WalletLedgerRow): WalletLedgerEntry {
  const type = isWalletLedgerType(row.type) ? row.type : "adjustment";

  return {
    id: row.id,
    userId: row.user_id,
    type,
    amount: toNumber(row.amount),
    balanceAfter: toNumber(row.balance_after),
    title: row.title || "Wallet activity",
    description: row.description,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    idempotencyKey: row.idempotency_key || null,
    createdAt: row.created_at,
  };
}

function mapRpcTransaction(row: WalletTransactionRpcRow) {
  const wallet: WalletSummary = {
    userId: row.wallet_user_id,
    availableCredit: toNumber(row.available_credit),
    pendingCredit: toNumber(row.pending_credit),
    lifetimeEarned: toNumber(row.lifetime_earned),
    lifetimeRedeemed: toNumber(row.lifetime_redeemed),
    updatedAt: row.wallet_updated_at,
  };
  const type = isWalletLedgerType(row.ledger_type) ? row.ledger_type : "adjustment";
  const entry: WalletLedgerEntry = {
    id: row.ledger_id,
    userId: row.wallet_user_id,
    type,
    amount: toNumber(row.ledger_amount),
    balanceAfter: toNumber(row.ledger_balance_after),
    title: row.ledger_title || "Wallet activity",
    description: row.ledger_description,
    referenceType: row.ledger_reference_type,
    referenceId: row.ledger_reference_id,
    idempotencyKey: row.ledger_idempotency_key,
    createdAt: row.ledger_created_at,
  };

  return {
    wallet,
    entry,
    alreadyApplied: Boolean(row.already_applied),
  };
}

export function isWalletLedgerType(value: unknown): value is WalletLedgerType {
  return (
    typeof value === "string" &&
    walletLedgerTypes.includes(value as WalletLedgerType)
  );
}

export async function getOrCreateWallet(
  supabase: SupabaseClient,
  userId: string,
) {
  const selectColumns =
    "user_id, available_credit, pending_credit, lifetime_earned, lifetime_redeemed, updated_at";
  const { data, error } = await supabase
    .from("wallets")
    .select(selectColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Wallet fetch error:", {
      error,
      errorMessage: error.message,
      userId,
    });
    throw new Error("GRAIL Wallet is temporarily unavailable.");
  }

  if (data) {
    return mapWallet(data as WalletRow);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("wallets")
    .insert({ user_id: userId })
    .select(selectColumns)
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing, error: refetchError } = await supabase
        .from("wallets")
        .select(selectColumns)
        .eq("user_id", userId)
        .maybeSingle();

      if (!refetchError && existing) {
        return mapWallet(existing as WalletRow);
      }
    }

    console.error("Wallet create error:", {
      error: insertError,
      errorMessage: insertError.message,
      userId,
    });
    throw new Error("GRAIL Wallet could not be created.");
  }

  return mapWallet(inserted as WalletRow);
}

export async function getWallet(
  supabase: SupabaseClient,
  userId: string,
  ledgerLimit = 10,
) {
  const wallet = await getOrCreateWallet(supabase, userId);
  const { data, error } = await supabase
    .from("wallet_ledger")
    .select(
      "id, user_id, type, amount, balance_after, title, description, reference_type, reference_id, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(ledgerLimit);

  if (error) {
    console.error("Wallet ledger fetch error:", {
      error,
      errorMessage: error.message,
      userId,
    });
    throw new Error("GRAIL Wallet activity could not be loaded.");
  }

  return {
    wallet,
    ledger: ((data || []) as WalletLedgerRow[]).map(mapLedger),
  };
}

export async function createLedgerEntry(
  supabase: SupabaseClient,
  input: LedgerInput,
) {
  const amount = fromCents(toCents(input.amount));

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Wallet amount must be a non-zero number.");
  }

  const { data, error } = await supabase.rpc("apply_wallet_transaction", {
    p_user_id: input.userId,
    p_type: input.type,
    p_amount: amount,
    p_title: input.title,
    p_description: input.description || null,
    p_reference_type: input.referenceType || null,
    p_reference_id: input.referenceId || null,
    p_idempotency_key: input.idempotencyKey || null,
  });

  if (error) {
    console.error("Atomic wallet transaction error:", {
      error,
      errorMessage: error.message,
      userId: input.userId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
    });
    throw new Error(error.message || "GRAIL Wallet transaction could not be applied.");
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error("GRAIL Wallet transaction did not return a result.");
  }

  return mapRpcTransaction(row as WalletTransactionRpcRow);
}

export async function addCredit(supabase: SupabaseClient, input: CreditInput) {
  return createLedgerEntry(supabase, {
    ...input,
    amount: Math.abs(input.amount),
    type: input.type || "future_admin_grant",
  });
}

export async function removeCredit(
  supabase: SupabaseClient,
  input: RemoveCreditInput,
) {
  return createLedgerEntry(supabase, {
    ...input,
    amount: -Math.abs(input.amount),
    type: "adjustment",
  });
}

export async function recalculateBalances(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("wallet_ledger")
    .select("type, amount")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Wallet recalculation fetch error:", {
      error,
      errorMessage: error.message,
      userId,
    });
    throw new Error("GRAIL Wallet could not be recalculated.");
  }

  const totals = ((data || []) as Pick<WalletLedgerRow, "type" | "amount">[]).reduce(
    (accumulator, row) => {
      const type = isWalletLedgerType(row.type) ? row.type : "adjustment";
      const amount = roundCurrency(toNumber(row.amount));
      accumulator.availableCredit = roundCurrency(accumulator.availableCredit + amount);

      if (amount > 0 && type !== "adjustment") {
        accumulator.lifetimeEarned = roundCurrency(accumulator.lifetimeEarned + amount);
      }

      if (type === "debit" && amount < 0) {
        accumulator.lifetimeRedeemed = roundCurrency(
          accumulator.lifetimeRedeemed + Math.abs(amount),
        );
      }

      return accumulator;
    },
    {
      availableCredit: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
    },
  );

  if (totals.availableCredit < 0) {
    throw new Error("GRAIL Credit recalculation would create a negative balance.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("wallets")
    .upsert({
      user_id: userId,
      available_credit: totals.availableCredit,
      pending_credit: 0,
      lifetime_earned: totals.lifetimeEarned,
      lifetime_redeemed: totals.lifetimeRedeemed,
      updated_at: new Date().toISOString(),
    })
    .select(
      "user_id, available_credit, pending_credit, lifetime_earned, lifetime_redeemed, updated_at",
    )
    .maybeSingle();

  if (updateError) {
    console.error("Wallet recalculation update error:", {
      error: updateError,
      errorMessage: updateError.message,
      userId,
    });
    throw new Error("GRAIL Wallet recalculation could not be saved.");
  }

  return mapWallet(updated as WalletRow);
}
