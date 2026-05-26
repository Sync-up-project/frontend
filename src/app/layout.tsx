import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Chrome } from "./Chrome";

export const metadata: Metadata = {
  title: "Sync Up",
  description: "프로젝트 협업 플랫폼",
  icons: {
    icon: "/assets/logo/syncup-icon.png",
    shortcut: "/assets/logo/syncup-icon.png",
    apple: "/assets/logo/syncup-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-white text-gray-900 dark:bg-slate-950 dark:text-gray-100">
        <Providers>
          <Chrome>{children}</Chrome>
        </Providers>
      </body>
    </html>
  );
}
