"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGetMyPage, apiGetNotices } from "@/lib/api";

type Notice = {
  id: string;
  title: string;
  titleJp?: string;
  content: string;
  contentJp?: string;
  createdAt: string;
  authorName: string;
  pinned: boolean;
};

function pickArray(obj: any): any[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.notices)) return obj.notices;
  if (Array.isArray(obj.data)) return obj.data;
  if (obj.result && Array.isArray(obj.result)) return obj.result;
  if (obj.result && Array.isArray(obj.result.items)) return obj.result.items;
  return [];
}

function normalizeNotice(raw: any): Notice {
  return {
    id: String(raw?.id ?? raw?.noticeId ?? ""),
    title: String(raw?.title ?? ""),
    titleJp: raw?.titleJp ?? raw?.titleJa ?? raw?.titleJP,
    content: String(raw?.content ?? raw?.body ?? ""),
    contentJp: raw?.contentJp ?? raw?.contentJa ?? raw?.contentJP,
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? new Date().toISOString()),
    authorName: String(raw?.authorName ?? raw?.author?.nickname ?? raw?.author ?? ""),
    pinned: Boolean(raw?.pinned ?? raw?.isPinned ?? false),
  };
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);

  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function excerpt(content: string) {
  const t = content.replace(/\s+/g, " ").trim();
  if (!t) return "내용이 없습니다.";
  return t.length > 90 ? `${t.slice(0, 90)}…` : t;
}
export default function NoticesClient() {
  const [query, setQuery] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkingRole, setCheckingRole] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 관리자 판별: /mypage role 기반
  useEffect(() => {
    let mounted = true;
    (async () => {
      setCheckingRole(true);
      try {
        const me = await apiGetMyPage();
        const role =
          (me as any)?.user?.role ??
          (me as any)?.data?.user?.role ??
          (me as any)?.role;

        const roleStr = String(role ?? "").toUpperCase();

        // 프로젝트에서 사용하는 ROLE에 맞춰 조정 가능
        const ok =
          roleStr === "ADMIN" ||
          roleStr === "OWNER" ||
          roleStr === "MANAGER" ||
          roleStr.includes("ADMIN");

        if (mounted) setIsAdmin(Boolean(ok));
      } catch {
        // 토큰 없거나 실패하면 admin 아님으로 처리
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setCheckingRole(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 공지 목록 로딩
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetNotices({ q: query.trim() ? query.trim() : undefined });
        const list = pickArray(res).map(normalizeNotice);

        // pinned 우선 + 최신순
        list.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return a.createdAt < b.createdAt ? 1 : -1;
        });

        if (mounted) setNotices(list);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load notices");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notices;

    return notices.filter((n) => {
      const hay = `${n.title} ${n.content} ${n.authorName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [notices, query]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">공지사항</h1>
            <p className="mt-1 text-sm text-gray-600">
              서비스 공지와 업데이트 내용을 확인할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {checkingRole ? (
              <span className="text-xs text-gray-500">권한 확인 중...</span>
            ) : isAdmin ? (
              <Link
                href="/notices/new"
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
              >
                + 공지 작성
              </Link>
            ) : null}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 제목/본문/작성자"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        {/* List */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-8">
              <p className="text-sm text-gray-700">불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="p-8">
              <p className="text-sm text-red-600">공지사항을 불러오지 못했습니다.</p>
              <p className="mt-2 text-xs text-gray-500 break-words">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <p className="text-sm text-gray-700">표시할 공지사항이 없습니다.</p>
              <p className="mt-2 text-xs text-gray-500">
                검색어를 변경해보세요.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((n) => (
                <li key={n.id} className="hover:bg-gray-50 transition">
                  <Link href={`/notices/${n.id}`} className="block p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {n.pinned ? (
                            <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                              고정
                            </span>
                          ) : null}
                          <span className="text-xs text-gray-500">{formatRelativeTime(n.createdAt)}</span>
                        </div>

                        <p className="mt-2 text-base font-semibold text-gray-900 line-clamp-1">
                          {n.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                          {excerpt(n.content)}
                        </p>

                        <div className="mt-3 text-xs text-gray-500">
                          <span className="font-semibold text-gray-700">{n.authorName}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs text-gray-400">→</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
