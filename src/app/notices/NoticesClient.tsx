"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { apiGetNotices } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { alertAndPushLogin } from "@/lib/requireLogin";

type NoticeListItem = {
  id: string;
  title: string;
  authorNickname: string;
  createdAt: string;
  pinned: boolean;
};

function normalizeListItem(raw: any): NoticeListItem {
  return {
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? raw?.titleOriginal ?? ""),
    authorNickname: String(raw?.authorNickname ?? raw?.author?.nickname ?? ""),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    pinned: Boolean(raw?.pinned ?? raw?.isPinned ?? false),
  };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function NoticesClient() {
  const { tr } = useI18n();
  const router = useRouter();

  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    const sync = () => setIsAuthed(Boolean(getAccessToken()));
    sync();
    window.addEventListener("auth:changed", sync);
    return () => window.removeEventListener("auth:changed", sync);
  }, []);

  const [query, setQuery] = useState("");

  const [items, setItems] = useState<NoticeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetNotices({ limit: 50, offset: 0 });
        const list = (res?.notices ?? []).map(normalizeListItem);

        list.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return a.createdAt < b.createdAt ? 1 : -1;
        });

        if (mounted) setItems(list);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => `${n.title} ${n.authorNickname}`.toLowerCase().includes(q));
  }, [items, query]);

  function onClickWrite() {
    if (isAuthed) {
      router.push("/notices/new");
      return;
    }
    alertAndPushLogin(router, tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
  }

  return (
    <div className="min-h-screen bg-white dark:bg-transparent">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-white/10">
              <Bell className="text-blue-600" size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{tr("공지사항", "お知らせ")}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/70">{tr("중요 공지 및 업데이트를 확인해 주세요.", "重要なお知らせと更新情報")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClickWrite}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {tr("작성하기", "作成")}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-3 dark:bg-white/5 dark:border-white/10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("검색(제목/작성자)", "検索（タイトル/作成者）")}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-sky-500/50"
          />
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white dark:bg-white/5 dark:border-white/10">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-gray-600 dark:text-white/70">{tr("불러오는 중...", "読み込み中...")}</div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-600 dark:text-white/70">{tr("공지사항이 없습니다.", "お知らせはありません。")}</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/10">
              {filtered.map((n) => (
                <li key={n.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5">
                  <Link href={`/notices/${n.id}`} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {n.pinned ? (
                          <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200">
                            {tr("상단", "固定")}
                          </span>
                        ) : null}
                        <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{n.title}</div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-white/60">
                        <span>{n.authorNickname || "-"}</span>
                        <span className="text-gray-300">·</span>
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                    </div>

                    <ChevronRight className="text-gray-400 dark:text-white/40" size={18} />
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
