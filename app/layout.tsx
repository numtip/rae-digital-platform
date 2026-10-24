import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAE Digital Platform",
  description:
    "แพลตฟอร์มดิจิทัลของสำนักวิจัยและส่งเสริมวิชาการการเกษตร มหาวิทยาลัยแม่โจ้",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
