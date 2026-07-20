import type { Metadata } from "next";
import { Inter, Playfair_Display, Hind_Siliguri } from "next/font/google";
import { Suspense } from "react";
import { MetaPixel } from "@/components/meta-pixel";
import "./globals.css";

import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "আড়ম্বর শৈলী (Arambar Saili)",
  description: "আড়ম্বর শৈলী (Arambar Saili) Premium fashion landing page and admin panel"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display"
});

const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-bengali"
});

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${hind.variable}`} suppressHydrationWarning>
        {/* Facebook Pixel — loads after interactive, tracks every route change */}
        <Suspense fallback={null}>
          <MetaPixel
            pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
            testEventCode={process.env.META_TEST_EVENT_CODE}
          />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
