import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { cardImageStorageBucket, sanitizeImageFileName } from "../../../../lib/imageUpload";

export const runtime = "nodejs";

const adminEmails = ["ryanjhaas99@gmail.com"];

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

async function requireAdmin(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      user: null,
      response: NextResponse.json({ error: "Missing authorization token." }, { status: 401 }),
    };
  }

  const supabase = createAnonSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  const email = user?.email?.toLowerCase() || "";

  if (error) {
    console.error("Admin homepage banner upload auth error:", error);
  }

  if (error || !user || !adminEmails.includes(email)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || "Unknown error");
  }

  return "Unknown error";
}

export async function POST(request: Request) {
  const { user, response } = await requireAdmin(request);

  if (response || !user) {
    return response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid banner image upload." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a banner image to upload." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Choose a valid image file for the homepage banner." }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "Choose a non-empty banner image." }, { status: 400 });
  }

  let serviceSupabase;

  try {
    serviceSupabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Admin homepage banner upload configuration error:", error);
    return NextResponse.json({ error: "Homepage banner upload is not configured." }, { status: 500 });
  }

  const safeFileName = sanitizeImageFileName(file.name);
  const uploadTimestamp = new Date().toISOString().replace(/[^0-9]/g, "");
  const filePath = `homepage-banners/${user.id}/${uploadTimestamp}-${safeFileName}`;

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from(cardImageStorageBucket)
      .upload(filePath, fileBuffer, {
        cacheControl: "3600",
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = serviceSupabase.storage
      .from(cardImageStorageBucket)
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error("No public URL was returned for the uploaded banner image.");
    }

    console.info("Homepage banner image uploaded", {
      adminId: user.id,
      bucketName: cardImageStorageBucket,
      filePath,
      fullPath: uploadData?.fullPath || null,
    });

    return NextResponse.json({
      imageUrl: data.publicUrl,
      filePath,
      fullPath: uploadData?.fullPath || null,
    });
  } catch (error) {
    console.error("Admin homepage banner storage upload error:", {
      adminId: user.id,
      bucketName: cardImageStorageBucket,
      filePath,
      exactMessage: getErrorMessage(error),
      error,
    });

    return NextResponse.json({ error: "Banner image upload failed." }, { status: 500 });
  }
}
