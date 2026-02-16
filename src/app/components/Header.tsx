"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { clearAccessToken, getAccessToken, getCurrentUser, authedGet } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type SimpleMe = {
  id: number;
  email: string;
  nickname: string;
  stacks?: string[];
};

type MyPageV2 = {
  user: {
    id: string | number;
    nickname: string;
    email: string;
    role?: string;
    primaryLanguage?: string;
    createdAt?: string;
  };
  github?: {
    username?: string;
    url?: string;
    isConnected?: boolean;
  };
};

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
    [tr],
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  async function loadMe() {
    const token = getAccessToken();
    if (!token) {
      setIsAuthed(false);
      setNickname(null);
      return;
    }

    setIsAuthed(true);

    const cached = getCurrentUser();
    setNickname(cached?.nickname ?? null);

    const isProd = process.env.NODE_ENV === "production";

    try {
      const me = await authedGet<SimpleMe>("/users/mypage");
      setNickname(me.nickname ?? cached?.nickname ?? null);
      return;
    } catch {
      // ignore
    }

    try {
      const mp = await authedGet<MyPageV2>("/mypage");
      setNickname(mp?.user?.nickname ?? cached?.nickname ?? null);
    } catch {
      if (isProd) {
        clearAccessToken();
        setIsAuthed(false);
        setNickname(null);
      }
    }
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
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="2" />
                <path d="M10 6v8M6 10h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900">Sync Up</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-4">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    active
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Lang */}
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-700">
              <Globe className="w-4 h-4" />
              <button
                type="button"
                onClick={() => setLang("KR")}
                className={cn(
                  "px-2 py-1 rounded-full transition-colors",
                  lang === "KR"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                KR
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setLang("JP")}
                className={cn(
                  "px-2 py-1 rounded-full transition-colors",
                  lang === "JP"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                JP
              </button>
            </div>

            {!isAuthed ? (
              <>
                <Link href="/login" className="text-gray-700 hover:text-gray-900 transition-colors">
                  {tr("로그인", "ログイン")}
                </Link>

                <Link
                  href="/signup"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {tr("회원가입", "会員登録")}
                </Link>
              </>
            ) : (
              <>
                <Link href="/mypage" className="text-gray-700 hover:text-gray-900 transition-colors">
                  {nickname ? `${nickname}${tr("님", "さん")}` : tr("내 계정", "アカウント")}
                </Link>

                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {tr("로그아웃", "ログアウト")}
                </button>
              </>,
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
