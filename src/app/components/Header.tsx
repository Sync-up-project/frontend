"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { clearAccessToken, getAccessToken, getCurrentUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Header() {
  const pathname = usePathname();
  const { lang, setLang, tr } = useI18n();

  const [isAuthed, setIsAuthed] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);

  const navItems = useMemo(
    () => [
      { href: "/projects", label: tr("프로젝트", "プロジェクト") },
      { href: "/community", label: tr("커뮤니티", "コミュニティ") },
      { href: "/notices", label: tr("공지사항", "お知らせ") },
      { href: "/mypage", label: tr("마이페이지", "マイページ") },
    ],
    [tr]
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  function loadMe() {
    const token = getAccessToken();
    if (!token) {
      setIsAuthed(false);
      setNickname(null);
      return;
    }

    setIsAuthed(true);

    const cached = getCurrentUser();
    setNickname(cached?.nickname ?? null);
  }

  function onLogout() {
    clearAccessToken();
    setIsAuthed(false);
    setNickname(null);
    window.location.href = "/";
  }

  useEffect(() => {
    loadMe();

    const onAuthChanged = () => loadMe();
    const onStorage = () => loadMe();

    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-sm z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-20">
        <div className="flex items-center gap-6 h-20">
          {/* Logo */}
          <Link href="/" prefetch={false} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2" />
                <path
                  d="M10 6v8M6 10h8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Sync Up</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false} // ✅ 자동 prefetch로 인한 불필요한 API 호출(404 폭발) 방지
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Language Switch */}
            <button
              type="button"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setLang(lang === "KO" ? "JP" : "KO")}
              aria-label="toggle language"
              title={lang === "KO" ? "日本語" : "한국어"}
            >
              <Globe className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="px-2 py-1 rounded-md bg-gray-100">{lang}</span>
              {nickname ? <span>{nickname}님</span> : null}
            </div>

            {isAuthed ? (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
