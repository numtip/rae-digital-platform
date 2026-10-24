import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Self-hosted at build time by next/font — no runtime request to Google.
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAE Digital Platform",
  description:
    "แพลตฟอร์มดิจิทัลของสำนักวิจัยและส่งเสริมวิชาการการเกษตร มหาวิทยาลัยแม่โจ้",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
