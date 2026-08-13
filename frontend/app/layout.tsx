import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Box Inspection",
  description: "Industrial box inspection system for iPad",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Box Inspection",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-100 antialiased">{children}</body>
    </html>
  );
}
