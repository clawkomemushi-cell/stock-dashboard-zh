import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { ChunkLoadRecovery } from "@/components/shared/ChunkLoadRecovery";

export const metadata: Metadata = {
  title: "台股 AI Cockpit · v3",
  description: "台股研究與決策輔助工作台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ChunkLoadRecovery />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
