import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar, Footer, WhatsAppButton, HelpButton, BottomNav } from '@/components'
import { Providers } from './providers';
import AuthInitializer from '@/components/AuthInitializer';
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wildwash.co.ke"),
  title: "Wild Wash",
  description: "Restore Your House",
  openGraph: {
    title: "Wild Wash",
    description: "Restore Your House",
    siteName: "Wild Wash",
    type: "website",
    images: [
      {
        url: "/images/Clean Now Pay Later.png",
        width: 1536,
        height: 1024,
        alt: "Wild Wash laundry services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wild Wash",
    description: "Restore Your House",
    images: ["/images/Clean Now Pay Later.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100`}
      >
        <Providers>
          <AuthInitializer />
          <NavBar />
          <main className="min-h-[calc(100vh-80px)] pt-20 pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
          <WhatsAppButton />
          <HelpButton />
          <Footer />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
