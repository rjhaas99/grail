import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "./lib/siteConfig";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.productionUrl),
  title: {
    default: `${siteConfig.siteName} | Protected Trading Card Marketplace`,
    template: `%s | ${siteConfig.siteName}`,
  },
  description:
    "Buy, sell, auction, and collect sports cards and trading cards with GRAIL Protected Checkout.",
  applicationName: siteConfig.siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.siteName,
    title: `${siteConfig.siteName} | Protected Trading Card Marketplace`,
    description:
      "A premium marketplace for sports cards and trading cards with protected checkout, auctions, seller tools, and dispute support.",
    url: siteConfig.productionUrl,
    images: [
      {
        url: siteConfig.defaultOgImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.siteName} marketplace`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.siteName} | Protected Trading Card Marketplace`,
    description:
      "Buy, sell, auction, and collect sports cards and trading cards with GRAIL Protected Checkout.",
    images: [siteConfig.defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "7KbgUVBfia1xhnWbvjQvnspiR_6S3rW8r1LZDvJzjRY",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.siteName,
  url: siteConfig.websiteUrl,
  publisher: {
    "@type": "Organization",
    name: siteConfig.companyName,
    url: siteConfig.websiteUrl,
    email: siteConfig.supportEmail,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteConfig.websiteUrl}/browse?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
