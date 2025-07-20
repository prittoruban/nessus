import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { BackToTop } from "@/components/ui/BackToTop";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HTC Global VA Report Assistance Portal",
  description:
    "Comprehensive vulnerability assessment reporting platform with multi-organizational support. Professional HTC Global VA format compliance for internal and external security assessments.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="!scroll-smooth" lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-gray-50 relative">
            <div className="lg:hidden h-16"></div> {/* Spacer for mobile header */}
            {children}
            <BackToTop />
          </main>
        </div>
      </body>
    </html>
  );
}
