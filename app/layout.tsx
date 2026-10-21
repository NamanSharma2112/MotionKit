import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./ui.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MotionKit — Motion components for React",
  description:
    "Hand-tuned React animations you can copy, paste and ship, plus playgrounds for SVG, shaders, ASCII and more.",
};

import SiteHeader from "./compoents/shell/SiteHeader";
import SiteFooter from "./compoents/shell/SiteFooter";
import ContactButton from "./compoents/ContactButton";
import PageTransition from "./compoents/PageTransition";

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
      <body className="min-h-full flex flex-col transition-colors duration-300" suppressHydrationWarning>
        <SiteHeader />
        <PageTransition>
          {children}
        </PageTransition>
        <SiteFooter />
        <ContactButton />
      </body>
    </html>
  );
}
