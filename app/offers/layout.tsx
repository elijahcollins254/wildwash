import type { Metadata } from "next";
import type { ReactNode } from "react";

const shareImage = "/images/Clean Now Pay Later.png";
const title = "Wild Wash Offers";
const description = "Discover current laundry and home-care offers from Wild Wash.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/offers" },
  openGraph: {
    title,
    description,
    url: "https://www.wildwash.co.ke/offers",
    siteName: "Wild Wash",
    type: "website",
    images: [
      {
        url: shareImage,
        width: 1536,
        height: 1024,
        alt: "Wild Wash laundry services and offers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [shareImage],
  },
};

export default function OffersLayout({ children }: { children: ReactNode }) {
  return children;
}
