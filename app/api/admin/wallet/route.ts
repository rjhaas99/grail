import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  addCredit,
  createLedgerEntry,
  removeCredit,
  type WalletLedgerEntry,
  type WalletSummary,
} from "../../../lib/wallet";
import { getWalletReasonLabel } from "../../../lib/walletLabels";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type ProgressRow = {
  user_id: string;
  xp: number | string | null;
  level: number | null;
  title: string | null;
};

type WalletRow = {
  user_id: string;
  available_credit: number | string | null;
  pending_credit: number | string | null;
  lifetime_earned: number | string | null;
  lifetime_redeemed: number | string | null;
  updated_at: string | null;
};

type AdminWalletPayload = {
  action?: string;
  userId?: string;
  amount?: number;
  reason?: string;
  note?: string;
  correctionDirection?: string;
  idempotencyKey?: string;
  referenceType?: string;
  referenceId?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function createAnonSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function createServiceSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
}

async function getCurrentUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: "Missing authorization token." };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error) {
    console.error("Admin wallet auth error:", {
      error,
      errorMessage: error.message,
    });
  }

  return { user, error: error?.message || null };
}

async function requireAdmin(request: Request) {
  const { user, error } = await getCurrentUser(request);
  const email = user?.email?.toLowerCase() || "";

  if (error || !user || !adminEmails.includes(email)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Unknown";
}

function getProfileName(profile?: ProfileRow, fallbackId?: string | null) {
  return profile?.full_name || profile?.username || shortId(fallbackId);
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

function normalizeAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function sanitizeSearch(value: string) {
  return value.replace(/[,%()]/g, "").trim().toLowerCase();
}

function getLedgerTypeForReason(action: string | undefined, reason: string | null) {
  if (action !== "grant") {
    return "adjustment" as const;
  }

  if (reason === "Promotion") {
    return "promotion" as const;
  }

  if (reason === "Referral Reward") {
    return "future_referral" as const;
  }

  return "future_admin_grant" as const;
}

function getSignedAmount(action: string | undefined, amount: number, direction?: string) {
  if (action === "remove") {
    return -Math.abs(amount);
  }

  if (action === "adjust" && direction === "decrease") {
    return -Math.abs(amount);
  }

  return Math.abs(amount);
}

function getDefaultNote(action: string | undefined) {
  if (action === "grant") {
    return "Granted by Admin";
  }

  if (action === "remove") {
    return "Removed by Admin";
  }

  return "Balance Correction";
}

function normalizeLedgerType(value: string | null | undefined) {
  const validTypes = new Set([
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
  ]);

  return value && validTypes.has(value) ? value : "adjustment";
}

export async function GET(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin wallet configuration error:", error);
    return NextResponse.json(
      { error: "Admin wallet is not configured." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const search = sanitizeSearch(searchParams.get("search") || "");
  const { data: walletData, error: walletError } = await serviceSupabase
    .from("wallets")
    .select(
      "user_id, available_credit, pending_credit, lifetime_earned, lifetime_redeemed, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (walletError) {
    console.error("Admin wallet fetch error:", {
      error: walletError,
      errorMessage: walletError.message,
      adminId: user.id,
    });
    return NextResponse.json(
      { error: "Wallet records could not be loaded." },
      { status: 500 },
    );
  }

  const wallets = ((walletData || []) as WalletRow[]).map(mapWallet);
  const userIds = Array.from(new Set(wallets.map((wallet) => wallet.userId)));
  const profilesById = new Map<string, ProfileRow>();
  const progressById = new Map<string, ProgressRow>();
  const emailsById = new Map<string, string>();
  let searchedProfiles: ProfileRow[] = [];
  let searchedAuthUsers: Array<{ id: string; email: string }> = [];

  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", userIds);

    if (profileError) {
      console.error("Admin wallet profile fetch error:", {
        error: profileError,
        errorMessage: profileError.message,
      });
    } else {
      ((profileData || []) as ProfileRow[]).forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }
  }

  if (search) {
    const { data: matchingProfileData, error: matchingProfileError } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, username")
      .or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)
      .limit(25);

    if (matchingProfileError) {
      console.error("Admin wallet search profile fetch error:", {
        error: matchingProfileError,
        errorMessage: matchingProfileError.message,
      });
    } else {
      searchedProfiles = (matchingProfileData || []) as ProfileRow[];
      searchedProfiles.forEach((profile) => {
        profilesById.set(profile.id, profile);
      });
    }

    const { data: authUsersData, error: authUsersError } =
      await serviceSupabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (authUsersError) {
      console.error("Admin wallet auth user search error:", {
        error: authUsersError,
        errorMessage: authUsersError.message,
      });
    } else {
      searchedAuthUsers = (authUsersData.users || [])
        .filter((authUser) => {
          const email = authUser.email?.toLowerCase() || "";
          return email.includes(search) || authUser.id.toLowerCase().includes(search);
        })
        .map((authUser) => ({
          id: authUser.id,
          email: authUser.email || "",
        }));

      searchedAuthUsers.forEach((authUser) => {
        emailsById.set(authUser.id, authUser.email);
      });
    }
  }

  const combinedUserIds = Array.from(
    new Set([
      ...userIds,
      ...searchedProfiles.map((profile) => profile.id),
      ...searchedAuthUsers.map((authUser) => authUser.id),
    ]),
  );

  if (combinedUserIds.length > 0) {
    const missingProfileIds = combinedUserIds.filter((profileId) => !profilesById.has(profileId));

    if (missingProfileIds.length > 0) {
      const { data: missingProfileData, error: missingProfileError } = await serviceSupabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", missingProfileIds);

      if (missingProfileError) {
        console.error("Admin wallet missing profile fetch error:", {
          error: missingProfileError,
          errorMessage: missingProfileError.message,
        });
      } else {
        ((missingProfileData || []) as ProfileRow[]).forEach((profile) => {
          profilesById.set(profile.id, profile);
        });
      }
    }

    const { data: progressData, error: progressError } = await serviceSupabase
      .from("user_progress")
      .select("user_id, xp, level, title")
      .in("user_id", combinedUserIds);

    if (progressError) {
      console.error("Admin wallet progression fetch error:", {
        error: progressError,
        errorMessage: progressError.message,
      });
    } else {
      ((progressData || []) as ProgressRow[]).forEach((progress) => {
        progressById.set(progress.user_id, progress);
      });
    }
  }

  const { data: ledgerData, error: ledgerError } = await serviceSupabase
    .from("wallet_ledger")
    .select(
      "id, user_id, type, amount, balance_after, title, description, reference_type, reference_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (ledgerError) {
    console.error("Admin wallet ledger fetch error:", {
      error: ledgerError,
      errorMessage: ledgerError.message,
    });
  }

  const normalizedLedger = ((ledgerData || []) as Array<{
    id: string;
    user_id: string;
    type: string | null;
    amount: number | string | null;
    balance_after: number | string | null;
    title: string | null;
    description: string | null;
    reference_type: string | null;
    reference_id: string | null;
    created_at: string | null;
  }>).map((entry) => ({
    id: entry.id,
    userId: entry.user_id,
    type: normalizeLedgerType(entry.type),
    amount: toNumber(entry.amount),
    balanceAfter: toNumber(entry.balance_after),
    title: entry.title || "Wallet activity",
    description: entry.description,
    referenceType: entry.reference_type,
    referenceId: entry.reference_id,
    createdAt: entry.created_at,
    userName: getProfileName(profilesById.get(entry.user_id), entry.user_id),
  }));

  const walletById = new Map(wallets.map((wallet) => [wallet.userId, wallet]));
  const allRecordIds = Array.from(
    new Set([
      ...wallets.map((wallet) => wallet.userId),
      ...searchedProfiles.map((profile) => profile.id),
      ...searchedAuthUsers.map((authUser) => authUser.id),
    ]),
  );
  const walletRecords = allRecordIds
    .map((userId) => {
      const wallet =
        walletById.get(userId) ||
        ({
          userId,
          availableCredit: 0,
          pendingCredit: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
          updatedAt: null,
        } satisfies WalletSummary);
      const profile = profilesById.get(wallet.userId);
      const progress = progressById.get(wallet.userId);
      return {
        ...wallet,
        userName: getProfileName(profile, wallet.userId),
        username: profile?.username || "",
        email: emailsById.get(wallet.userId) || "",
        level: progress?.level || 1,
        xp: toNumber(progress?.xp),
        rankTitle: progress?.title || "SEEKER",
      };
    })
    .filter((wallet) => {
      if (!search) {
        return true;
      }

      return (
        wallet.userId.toLowerCase().includes(search) ||
        wallet.userName.toLowerCase().includes(search) ||
        wallet.username.toLowerCase().includes(search) ||
        wallet.email.toLowerCase().includes(search)
      );
    });

  return NextResponse.json({
    wallets: walletRecords,
    ledger: normalizedLedger,
  });
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin wallet configuration error:", error);
    return NextResponse.json(
      { error: "Admin wallet is not configured." },
      { status: 500 },
    );
  }

  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  const payload = (await request.json().catch(() => ({}))) as AdminWalletPayload;
  const userId = payload.userId?.trim();
  const amount = normalizeAmount(payload.amount);
  const reason = payload.reason?.trim() || "Manual Correction";
  const note = payload.note?.trim() || "";
  const description = note ? `${getDefaultNote(payload.action)}: ${note}` : getDefaultNote(payload.action);
  const referenceType = payload.referenceType?.trim() || "admin_wallet";
  const referenceId = payload.referenceId?.trim() || user.id;
  const idempotencyKey =
    payload.idempotencyKey?.trim() ||
    `admin-wallet:${user.id}:${userId || "missing"}:${payload.action || "unknown"}:${Date.now()}`;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  if (!amount || amount < 0) {
    return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
  }

  try {
    let result: { wallet: WalletSummary; entry: WalletLedgerEntry; alreadyApplied?: boolean };
    const signedAmount = getSignedAmount(
      payload.action,
      amount,
      payload.correctionDirection,
    );
    const ledgerType = getLedgerTypeForReason(payload.action, reason);
    const title = getWalletReasonLabel(reason, ledgerType);

    if (payload.action === "grant") {
      result = await addCredit(serviceSupabase, {
        userId,
        amount,
        type: ledgerType,
        title,
        description,
        referenceType,
        referenceId,
        idempotencyKey,
      });
    } else if (payload.action === "remove") {
      result = await removeCredit(serviceSupabase, {
        userId,
        amount,
        title,
        description,
        referenceType,
        referenceId,
        idempotencyKey,
      });
    } else if (payload.action === "adjust") {
      result = await createLedgerEntry(serviceSupabase, {
        userId,
        amount: signedAmount,
        type: "adjustment",
        title,
        description,
        referenceType,
        referenceId,
        idempotencyKey,
      });
    } else {
      return NextResponse.json({ error: "Unsupported wallet action." }, { status: 400 });
    }

    return NextResponse.json({
      wallet: result.wallet,
      entry: result.entry,
      alreadyApplied: Boolean(result.alreadyApplied),
      message: result.alreadyApplied ? "Wallet transaction was already applied." : "Wallet updated.",
    });
  } catch (error) {
    console.error("Admin wallet update error:", {
      error,
      adminId: user.id,
      targetUserId: userId,
      action: payload.action,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet could not be updated." },
      { status: 500 },
    );
  }
}
