"use client";

import { usePathname } from "next/navigation";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";

function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/login" || pathname === "/signup" || pathname.startsWith("/admin");
}

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isAuthRoute(pathname)) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 dark:bg-slate-950 dark:border-white/10">
        <Header />
      </div>

      <main className="flex-1 bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {children}
      </main>
      <Footer />

      <ChatWidget />
    </div>
  );
}
