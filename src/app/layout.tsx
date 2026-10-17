import type { Metadata } from "next";
import type { ReactNode } from "react";
import Scenery from "@/components/Scenery";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "タスク管理ボード",
  description: "チームで使えるシンプルなカンバン形式のタスク管理ツール",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <div className="relative z-10">{children}</div>
        </AuthProvider>
        <Scenery />
      </body>
    </html>
  );
}
