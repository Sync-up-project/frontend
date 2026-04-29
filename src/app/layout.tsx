import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";

export const metadata: Metadata = {
  title: "Sync Up",
  description: "프로젝트 협업 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="light">
      <body className="min-h-screen text-gray-900 antialiased">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
              <Header />
            </div>

            <main className="flex-1">{children}</main>
            <Footer />

            {/* ✅ 전역 채팅 위젯 */}
            <ChatWidget />
          </div>
        </Providers>
      </body>
    </html>
  );
}