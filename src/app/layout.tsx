import type { Metadata } from "next";
import { Itim, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const itim = Itim({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-itim",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://payease.app"),
  title: "PayEase | Pay for subscriptions with USDC on Avalanche",
  description:
    "Pay for X Blue and Replit Pro with USDC on Avalanche. No cards, no hassle. We handle the payment; you enjoy the service.",
  keywords: [
    "PayEase",
    "USDC",
    "Avalanche",
    "crypto subscriptions",
    "X Blue",
    "Replit Pro",
    "virtual card",
    "stablecoin payments",
  ],
  openGraph: {
    title: "PayEase | Pay for subscriptions with USDC on Avalanche",
    description:
      "Instantly pay for global tech subscriptions like X Blue and Replit Pro using USDC on Avalanche.",
    url: "/",
    siteName: "PayEase",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayEase | Pay for subscriptions with USDC on Avalanche",
    description:
      "Instantly pay for global tech subscriptions like X Blue and Replit Pro using USDC on Avalanche.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${manrope.className} ${manrope.variable} ${itim.variable} min-h-screen overflow-x-hidden bg-[#06081a] leading-[1.4] text-[#e9edff] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
