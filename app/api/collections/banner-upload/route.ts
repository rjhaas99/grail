import { NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getCurrentUser,
} from "../../auctions/_shared";
import { cardImageStorageBucket, sanitizeImageFileName } from "../../../lib/imageUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Unknown error");
  }

  return "Unknown error";
}

export async function POST(request: Request) {
  const { user, error: authError } = await getCurrentUser(request);

  if (authError || !user?.id) {
    return NextResponse.json(
      { error: "Sign in to upload a collection banner." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid collection banner upload." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const collectionOwnerId = String(formData.get("collectionOwnerId") || "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose a banner image to upload." },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Choose a valid image file for the collection banner." },
      { status: 400 },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { error: "Choose a non-empty banner image." },
      { status: 400 },
    );
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Choose a banner image 8 MB or smaller." },
      { status: 400 },
    );
  }

  if (collectionOwnerId && collectionOwnerId !== user.id) {
    return NextResponse.json(
      { error: "You can only upload banners for your own collection." },
      { status: 403 },
    );
  }

  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Collection banner upload configuration error:", error);
    return NextResponse.json(
      { error: "Collection banner upload is temporarily unavailable." },
      { status: 500 },
    );
  }

  const safeFileName = sanitizeImageFileName(file.name);
  const uploadTimestamp = new Date().toISOString().replace(/[^0-9]/g, "");
  const filePath = `collection-banners/${user.id}/${uploadTimestamp}-${safeFileName}`;

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(cardImageStorageBucket)
      .upload(filePath, fileBuffer, {
        cacheControl: "3600",
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(cardImageStorageBucket)
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error("Collection banner URL could not be created.");
    }

    return NextResponse.json({
      imageUrl: data.publicUrl,
      filePath,
      fullPath: uploadData?.fullPath || null,
    });
  } catch (error) {
    console.error("Collection banner upload error:", {
      userId: user.id,
      bucketName: cardImageStorageBucket,
      filePath,
      exactMessage: getErrorMessage(error),
      error,
    });

    return NextResponse.json(
      { error: "Collection banner upload failed." },
      { status: 500 },
    );
  }
}
