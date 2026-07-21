import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  dispute_status: string | null;
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

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
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
    console.error("Dispute evidence upload auth error:", error);
  }

  return { user, error: error?.message || null };
}

export async function POST(request: Request) {
  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Dispute evidence upload configuration error:", error);
    return NextResponse.json(
      { error: "Dispute evidence upload is temporarily unavailable." },
      { status: 500 },
    );
  }

  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to upload dispute evidence." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid evidence upload form." }, { status: 400 });
  }

  const orderId = String(formData.get("orderId") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const file = formData.get("file");

  if (!orderId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Order id and evidence image are required." },
      { status: 400 },
    );
  }

  const { data: orderData, error: orderError } = await serviceSupabase
    .from("orders")
    .select("id, buyer_id, seller_id, dispute_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("Dispute evidence order fetch error:", {
      error: orderError,
      errorMessage: orderError.message,
      orderId,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Dispute order could not be loaded." },
      { status: 500 },
    );
  }

  const order = orderData as OrderRow | null;

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (!["opened", "under_review"].includes(order.dispute_status || "")) {
    return NextResponse.json(
      { error: "Evidence can only be uploaded while a dispute is open or under review." },
      { status: 400 },
    );
  }

  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;

  if (!isBuyer && !isSeller) {
    return NextResponse.json(
      { error: "You are not allowed to upload evidence for this order." },
      { status: 403 },
    );
  }

  const role = isBuyer ? "buyer" : "seller";
  const safeFileName = sanitizeFileName(file.name) || "evidence.jpg";
  const filePath = `disputes/${order.id}/${user.id}/${Date.now()}-${safeFileName}`;

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await serviceSupabase.storage
      .from("card-images")
      .upload(filePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Dispute evidence storage upload error:", {
        error: uploadError,
        errorMessage: uploadError.message,
        orderId,
        userId: user.id,
        filePath,
        fileName: file.name,
      });
      return NextResponse.json(
        { error: `Evidence image could not be uploaded: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data: evidenceData, error: insertError } = await serviceSupabase
      .from("dispute_evidence")
      .insert({
        order_id: order.id,
        uploaded_by: user.id,
        role,
        image_url: filePath,
        note: note || null,
      })
      .select("id, order_id, uploaded_by, role, image_url, note, created_at")
      .single();

    if (insertError) {
      console.error("Dispute evidence insert error:", {
        error: insertError,
        errorMessage: insertError.message,
        orderId,
        userId: user.id,
        filePath,
      });
      return NextResponse.json(
        { error: `Evidence record could not be saved: ${insertError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ evidence: evidenceData });
  } catch (error) {
    console.error("Dispute evidence upload unexpected error:", {
      error,
      orderId,
      userId: user.id,
      filePath,
    });
    return NextResponse.json(
      { error: "Evidence upload failed." },
      { status: 500 },
    );
  }
}
