import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import Script from "next/script";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omegle",
  description: "A new way of connectivity ",
};

import { Suspense } from "react";
import AppLayout from "@/Components/AppLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
            <AppLayout>
              {children}
            </AppLayout>
          </Suspense>
          <Toaster position="top-center" richColors />
        </Providers>
        
        {/* Google Translate Target */}
        <div id="google_translate_element" className="fixed bottom-4 right-4 z-[9999]"></div>

        {/* Google Translate Logic */}
        <Script
          id="google-translate-config"
          strategy="afterInteractive"
        >
          {`
            window.googleTranslateElementInit = function() {
              new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
              }, 'google_translate_element');
            }
          `}
        </Script>
        <Script
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
