import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "警察四等特考複習站｜每日題庫・法條・申論",
  description: "你的警察特考讀書工作台。題庫逐項解析、法條速記、正式申論、錯題回顧與每日練習，專為手機與考前複習設計。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
