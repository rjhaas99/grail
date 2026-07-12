import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { releaseSellerPayoutForOrder } from "../../../../lib/releaseSellerPayout";

export const runtime = "nodejs";

type ReleaseRequestBody = {
  orderId?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
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

function errorResponse(error: string, detail: string, status: number) {
  return NextResponse.json({ error, detail }, { status });
}

export async function POST(request: Request) {
  let body: ReleaseRequestBody;

  try {
    body = (await request.json()) as ReleaseRequestBody;
  } catch (error) {
    console.error("Payout release JSON parse error:", error);
    return errorResponse(
      "Invalid payout release request.",
      "The payout release request body could not be parsed.",
      400,
    );
  }

  const orderId = body.orderId?.trim();

  if (!orderId) {
    return errorResponse("Order ID is required.", "No orderId was provided.", 400);
  }

  try {
    const supabase = createServiceSupabaseClient();
    const token = getBearerToken(request);

    if (!token) {
      return errorResponse(
        "Sign in to release payouts.",
        "Missing authenticated Supabase session token.",
        401,
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError) {
      console.error("Payout release auth error:", userError);
    }

    if (!user?.id) {
      return errorResponse(
        "Sign in to release payouts.",
        "Supabase could not resolve the current user.",
        401,
      );
    }

    const result = await releaseSellerPayoutForOrder({
      supabase,
      orderId,
      expectedSellerId: user.id,
      source: "manual",
    });

    if (result.status === "paid" || result.status === "already_paid") {
      return NextResponse.json({
        success: true,
        status: result.status,
        transferId: result.transferId,
        sellerPayoutAmount: result.sellerPayoutAmount,
      });
    }

    if (result.status === "queued") {
      return NextResponse.json({
        success: false,
        status: "queued",
        detail: result.detail,
        sellerPayoutAmount: result.sellerPayoutAmount,
      });
    }

    return errorResponse(
      "Payout could not be released.",
      result.detail || "Order is not eligible for payout release.",
      result.status === "skipped" ? 400 : 500,
    );
  } catch (error) {
    console.error("Payout release error:", error);
    return NextResponse.json(
      { error: "Payout could not be released." },
      { status: 500 },
    );
  }
}
