"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { apiGetNotices, type NoticeListItem } from "@/lib/noticeApi";

function isNew(iso: string, days = 7) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const diff = Date.now() - t;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeListItem(raw: any): NoticeListItem {
  return {
    id: String(raw?.id ?? raw?.noticeId ?? ""),
    pinned: Boolean(raw?.pinned ?? false),
    title: String(raw?.title ?? raw?.titleOriginal ?? ""),
    authorNickname: String(raw?.authorNickname ?? raw?.author?.nickname ?? raw?.authorName ?? ""),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    viewCount: Number(raw?.viewCount ?? 0),
    i18n: raw?.i18n,
  };
}

export default function NoticesClient() {
  const { tr } = useI18n();

  const [activeTab, setActiveTab] = useState<"notice" | "faq" | "inquiry" | "support">("notice");
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

        // pinned 먼저, 최신순
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

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
              <Bell className="text-blue-600" size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{tr("공지사항", "お知らせ")}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {tr("SyncUp의 새로운 소식을 확인하세요", "SyncUp の最新情報を確認しましょう")}
              </p>
            </div>
          </div>

          {/* ✅ 관리자 권한 없이 작성 가능(요구사항) */}
          <Link
            href="/notices/new"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {tr("작성하기", "作成")}
          </Link>
        </div>

        {/* Tabs (StageBridge 느낌: 다른 탭은 UI만, 클릭해도 disabled) */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: "notice", label: tr("공지사항", "お知らせ"), enabled: true },
            { key: "faq", label: tr("자주 묻는 질문", "よくある質問"), enabled: false },
            { key: "inquiry", label: tr("1:1 문의", "1:1 お問い合わせ"), enabled: false },
            { key: "support", label: tr("고객지원", "サポート"), enabled: false },
          ].map((t) => {
            const selected = activeTab === (t.key as any);
            const disabled = !t.enabled;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => !disabled && setActiveTab(t.key as any)}
                disabled={disabled}
                className={[
                  "rounded-2xl px-5 py-2 text-sm font-semibold transition",
                  selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  disabled ? "opacity-50 cursor-not-allowed hover:bg-gray-100" : "",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="mt-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("검색: 제목/작성자", "検索: タイトル/作成者")}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
              {tr("불러오는 중...", "読み込み中...")}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8">
              <p className="text-sm font-semibold text-red-600">
                {tr("공지사항을 불러오지 못했습니다.", "読み込みに失敗しました。")}
              </p>
              <p className="mt-2 text-xs text-gray-500 break-words">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
              {tr("표시할 공지사항이 없습니다.", "表示するお知らせがありません。")}
            </div>
          ) : (
            filtered.map((n) => {
              const tagLabel = n.pinned ? tr("업데이트", "アップデート") : tr("서비스", "サービス");
              const newBadge = isNew(n.createdAt);

              return (
                <Link
                  key={n.id}
                  href={`/notices/${n.id}`}
                  className="group block rounded-3xl border border-gray-100 bg-white px-6 py-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                            n.pinned ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700",
                          ].join(" ")}
                        >
                          {tagLabel}
                        </span>

                        {newBadge ? (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
                            NEW
                          </span>
                        ) : null}

                        <span className="text-xs text-gray-500">{formatDate(n.createdAt)}</span>
                      </div>

                      <div className="mt-3">
                        <p className="line-clamp-1 text-lg font-extrabold text-gray-900 transition-colors group-hover:text-blue-700">
                          {n.title}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{n.authorNickname || tr("작성자", "作成者")}</span>
                        <span className="text-gray-300">|</span>
                        <span>
                          {tr("조회", "閲覧")}: {n.viewCount}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="shrink-0 text-gray-300 transition group-hover:text-blue-600" size={20} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}