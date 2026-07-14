import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getCurrentMarketplaceEvent,
  getMarketplaceSwitches,
} from "../../../lib/marketplaceEconomy";

export const runtime = "nodejs";

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

export async function GET() {
  let supabase;

  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    console.error("Marketplace status configuration error:", error);
    return NextResponse.json(
      { error: "Marketplace status is not configured." },
      { status: 500 },
    );
  }

  try {
    const [switches, eventState] = await Promise.all([
      getMarketplaceSwitches(supabase),
      getCurrentMarketplaceEvent(supabase),
    ]);

    return NextResponse.json({
      marketplaceStatus: switches.marketplaceEnabled ? "Live" : "Paused",
      currentMarketplaceState: !switches.marketplaceEnabled
        ? "Paused"
        : eventState.currentEvent
          ? "Event Live"
          : eventState.upcomingEvent
            ? "Event Upcoming"
            : "Normal",
      currentEvent: eventState.currentEvent,
      upcomingEvent: eventState.upcomingEvent,
      endedEvent: eventState.endedEvent,
      currentBanner: eventState.currentBanner,
      currentCountdown: eventState.currentCountdown,
      eventNotifications: eventState.notificationFramework,
      currentMultipliers: {
        buyerMultiplier: eventState.currentEvent?.buyerMultiplier ?? 1,
        sellerMultiplier: eventState.currentEvent?.sellerMultiplier ?? 1,
        xpMultiplier: eventState.currentEvent?.xpMultiplier ?? 1,
        walletMultiplier: eventState.currentEvent?.walletMultiplier ?? 1,
        treasureMultiplier: eventState.currentEvent?.treasureMultiplier ?? 1,
        challengeMultiplier: eventState.currentEvent?.challengeMultiplier ?? 1,
      },
    });
  } catch (error) {
    console.error("Marketplace status load error:", error);
    return NextResponse.json(
      { error: "Marketplace status could not be loaded." },
      { status: 500 },
    );
  }
}
