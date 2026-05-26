"use client";

import { Globe, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { clearAccessToken, getAccessToken, getCurrentUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { normalizeDisplayUser, getLanguageBadge } from "@/lib/userDisplay";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function headerButtonBase() {
  return "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors";
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, tr } = useI18n();
  const { theme, setTheme } = useTheme();

  const [isAuthed, setIsAuthed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const navItems = useMemo(
    () => [
      { href: "/projects", label: tr("프로젝트", "プロジェクト") },
      { href: "/community", label: tr("커뮤니티", "コミュニティ") },
      { href: "/notices", label: tr("공지사항", "お知らせ") },
      { href: "/mypage", label: tr("마이페이지", "マイページ") },
    ],
    [tr]
  );

  useEffect(() => {
    let mounted = true;

    async function refreshAuth() {
      try {
        const token = getAccessToken();
        if (!token) {
          if (!mounted) return;
          setIsAuthed(false);
          setDisplayName(null);
          setAvatarUrl(null);
          return;
        }

        const me = await getCurrentUser();
        if (!mounted) return;

        const du = normalizeDisplayUser(me);
        setDisplayName(du?.displayName ?? null);
        setAvatarUrl(du?.avatarUrl ?? null);
        setIsAuthed(true);
      } catch {
        if (!mounted) return;
        setIsAuthed(false);
        setDisplayName(null);
        setAvatarUrl(null);
      }
    }

    refreshAuth();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function onLogout() {
    try {
      clearAccessToken();
    } finally {
      setIsAuthed(false);
      setDisplayName(null);
      setAvatarUrl(null);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="w-full border-b bg-white dark:bg-slate-950 dark:border-white/10">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            {/* Small screens + dark mode: icon, Light mode md+: horizontal lockup */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo/syncup-icon.png"
              alt="SyncUp logo"
              className="h-8 w-8 object-contain md:hidden dark:md:block"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo/syncup-logo-horizontal.png"
              alt="SyncUp logo"
              className="hidden h-7 w-auto object-contain md:block dark:md:hidden"
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
                    active && "font-semibold text-zinc-900 dark:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn(
              headerButtonBase(),
              "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              "dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
            )}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="theme"
          >
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="text-xs">{theme === "dark" ? "Dark" : "Light"}</span>
          </button>
          <button
            type="button"
            className={cn(
              headerButtonBase(),
              "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              "dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
            )}
            onClick={() => setLang(lang === "KR" ? "JP" : "KR")}
            aria-label="language"
          >
            <Globe className="h-4 w-4" />
            <span className="text-xs">{lang === "KR" ? "KO" : "JA"}</span>
          </button>

          {isAuthed ? (
            <>
              {/* 아바타(있으면) + 이름 */}
              <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-800">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="h-6 w-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <span>{displayName ? `${displayName}님` : tr("로그인됨", "ログイン中")}</span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className={cn(
                  "inline-flex h-9 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800",
                  "dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                )}
              >
                {tr("로그아웃", "ログアウト")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={cn(
                "inline-flex h-9 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800",
                "dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
              )}
            >
              {tr("로그인", "ログイン")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
