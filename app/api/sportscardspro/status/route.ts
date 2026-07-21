import { NextResponse } from "next/server";
import {
  getSportsCardsProToken,
  requireAuthenticatedUser,
  sportsCardsProBaseUrl,
} from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(
    {
      configured: Boolean(getSportsCardsProToken()),
      baseUrl: sportsCardsProBaseUrl,
      runtime,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
