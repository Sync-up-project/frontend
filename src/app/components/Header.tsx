"use client";

import { Globe } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearAccessToken, getAccessToken, getCurrentUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { normalizeDisplayUser, getLanguageBadge } from "@/lib/userDisplay";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, tr } = useI18n();

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
    <header className="w-full border-b bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              +
            </div>
            <span className="text-lg font-bold">Sync Up</span>
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
                    "text-sm text-zinc-600 hover:text-zinc-900",
                    active && "font-semibold text-zinc-900"
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
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={() => setLang(lang === "ko" ? "ja" : "ko")}
            aria-label="language"
          >
            <Globe className="h-4 w-4" />
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
              {lang === "ko" ? "KO" : "JA"}
            </span>
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
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {tr("로그아웃", "ログアウト")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {tr("로그인", "ログイン")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}