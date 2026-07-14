import { ImageResponse } from "next/og";
import { siteConfig } from "./lib/siteConfig";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 50% 0%, rgba(231,222,208,0.18), transparent 40%), linear-gradient(135deg, #000 0%, #070709 58%, #000 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "76px",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            color: "#E7DED0",
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          {siteConfig.siteName}
        </div>
        <div
          style={{
            marginTop: 30,
            maxWidth: 860,
            fontSize: 78,
            lineHeight: 0.95,
            fontWeight: 900,
          }}
        >
          Protected Trading Card Marketplace
        </div>
        <div
          style={{
            marginTop: 34,
            color: "#C9CDD3",
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          Sports cards, TCG cards, auctions, protected checkout.
        </div>
        <div
          style={{
            marginTop: 54,
            width: 260,
            height: 2,
            background: "linear-gradient(90deg, #E7DED0, transparent)",
          }}
        />
      </div>
    ),
    size,
  );
}
