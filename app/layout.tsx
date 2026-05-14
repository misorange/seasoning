import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { SessionBootstrap } from "./_components/session-bootstrap";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp" });

export const metadata: Metadata = {
  title: "Seasoning",
  description: "非同期型等価交換日記アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`h-full antialiased ${inter.variable} ${notoSansJP.variable}`}>
      <body className="min-h-full bg-white text-gray-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 relative">
        <SessionBootstrap />
        {children}
      </body>
    </html>
  );
}
