"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { apiGetCommunityPosts } from "@/lib/api";

type Category = "free" | "question" | "share" | "review";
type SortKey = "latest" | "popular" | "commented";

type Post = {
  id: string;
  category: Category;
  title: string;
  titleJp?: string;
  content: string;
  contentJp?: string;
  tags: string[];
  createdAt: string; // ISO
  authorName: string;
  likes: number;
  commentsCount: number;
};

function pickArray(obj: any): any[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.posts)) return obj.posts;
  if (Array.isArray(obj.data)) return obj.data;
  if (obj.result && Array.isArray(obj.result)) return obj.result;
  if (obj.result && Array.isArray(obj.result.items)) return obj.result.items;
  return [];
}

function normalizePost(raw: any): Post {
  return {
    id: String(raw?.id ?? raw?.postId ?? ""),
    category: (raw?.category ?? "free") as Category,
    title: String(raw?.title ?? ""),
    titleJp: raw?.titleJp ?? raw?.titleJa ?? raw?.titleJP,
    content: String(raw?.content ?? raw?.body ?? ""),
    contentJp: raw?.contentJp ?? raw?.contentJa ?? raw?.contentJP,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? new Date().toISOString()),
    authorName: String(raw?.authorName ?? raw?.author?.nickname ?? raw?.author ?? ""),
    likes: Number(raw?.likes ?? raw?.likeCount ?? 0),
    commentsCount: Number(raw?.commentsCount ?? raw?.commentCount ?? 0),
  };
}

const TABS: { key: Category; labelKr: string; labelJp: string }[] = [
  { key: "free", labelKr: "자유", labelJp: "フリー" },
  { key: "question", labelKr: "QnA", labelJp: "QnA" },
  { key: "share", labelKr: "정보 공유", labelJp: "情報共有" },
  { key: "review", labelKr: "후기", labelJp: "レビュー" },
];

const SORTS: { key: SortKey; labelKr: string; labelJp: string }[] = [
  { key: "latest", labelKr: "최신순", labelJp: "新着順" },
  { key: "popular", labelKr: "인기순", labelJp: "人気順" },
  { key: "commented", labelKr: "댓글순", labelJp: "コメント順" },
];

function isCategory(v: string | null): v is Category {
  return v === "free" || v === "question" || v === "share" || v === "review";
}

function categoryBadge(category: Category) {
  const base = "inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold";
  switch (category) {
    case "question":
      return `${base} bg-blue-100 text-blue-700`;
    case "share":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "review":
      return `${base} bg-amber-100 text-amber-700`;
    case "free":
    default:
      return `${base} bg-gray-100 text-gray-700`;
  }
}

function TabButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm font-semibold border transition",
        selected
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-900">{children}</p>;
}

export default function CommunityClient() {
  const { tr } = useI18n();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Category>("free");
  const [posts, setPosts] = useState<Post[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function categoryLabel(category: Category) {
    switch (category) {
      case "question":
        return tr("QnA", "QnA");
      case "share":
        return tr("정보 공유", "情報共有");
      case "review":
        return tr("후기", "レビュー");
      case "free":
      default:
        return tr("자유", "フリー");
    }
  }

  function excerpt(content: string) {
    const t = content.replace(/\s+/g, " ").trim();
    if (!t) return tr("내용이 없습니다.", "内容がありません。");
    return t.length > 90 ? `${t.slice(0, 90)}…` : t;
  }

  function formatRelativeTime(iso: string) {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - d);

    const min = Math.floor(diff / 60000);
    if (min < 1) return tr("방금 전", "たった今");
    if (min < 60) return tr(`${min}분 전`, `${min}分前`);

    const hr = Math.floor(min / 60);
    if (hr < 24) return tr(`${hr}시간 전`, `${hr}時間前`);

    const day = Math.floor(hr / 24);
    return tr(`${day}일 전`, `${day}日前`);
  }

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (isCategory(tabParam)) setTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetCommunityPosts({
          category: tab,
          sort: sortKey,
          q: query.trim() ? query.trim() : undefined,
        });
        const list = pickArray(res).map(normalizePost);
        if (mounted) setPosts(list);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tab, sortKey, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = posts.filter((p) => p.category === tab);

    const searched =
      q.length === 0
        ? base
        : base.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.content.toLowerCase().includes(q) ||
              p.authorName.toLowerCase().includes(q) ||
              p.tags.some((t) => t.toLowerCase().includes(q)),
          );

    const sortFn = (a: Post, b: Post) => {
      if (sortKey === "popular") return (b.likes - a.likes) || (a.createdAt < b.createdAt ? 1 : -1);
      if (sortKey === "commented")
        return (b.commentsCount - a.commentsCount) || (a.createdAt < b.createdAt ? 1 : -1);
      return a.createdAt < b.createdAt ? 1 : -1;
    };

    return [...searched].sort(sortFn);
  }, [posts, tab, query, sortKey]);

  const trending = useMemo(() => {
    return [...posts]
      .sort((a, b) => b.likes + b.commentsCount * 2 - (a.likes + a.commentsCount * 2))
      .slice(0, 6);
  }, [posts]);

  function resetSearch() {
    setQuery("");
    setSortKey("latest");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="min-w-0 lg:col-span-10">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {tr("커뮤니티", "コミュニティ")}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {tr(
                    "탭을 선택해 목적에 맞는 글만 확인할 수 있습니다.",
                    "タブを選んで目的に合う投稿だけ確認できます。",
                  )}
                </p>
              </div>

              <Link
                href={`/community/new?category=${tab}`}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
              >
                {tr("+ 글쓰기", "+ 投稿する")}
              </Link>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {TABS.map((t) => (
                <TabButton
                  key={t.key}
                  label={tr(t.labelKr, t.labelJp)}
                  selected={tab === t.key}
                  onClick={() => {
                    setTab(t.key);
                    resetSearch();
                  }}
                />
              ))}
            </div>

            {/* Search + Sort */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tr("검색: 제목, 본문, 태그, 작성자", "検索: タイトル、本文、タグ、作成者")}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-[140px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {tr(s.labelKr, s.labelJp)}
                  </option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-8">
                  <p className="text-sm text-gray-700">{tr("불러오는 중...", "読み込み中...")}</p>
                </div>
              ) : error ? (
                <div className="p-8">
                  <p className="text-sm text-red-600">{tr("불러오기에 실패했습니다.", "読み込みに失敗しました。")}</p>
                  <p className="mt-2 text-xs text-gray-500 break-words">{error}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8">
                  <p className="text-sm text-gray-700">
                    {tr("조건에 맞는 게시글이 없습니다.", "条件に合う投稿がありません。")}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {tr("탭을 변경하거나 검색어를 조정해 주세요.", "タブを変更するか検索語を調整してください。")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((p) => {
                    const title = tr(p.title, p.titleJp ?? p.title);
                    const content = tr(p.content, p.contentJp ?? p.content);

                    return (
                      <li key={p.id} className="hover:bg-gray-50 transition">
                        <Link href={`/community/${p.id}`} className="block p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={categoryBadge(p.category)}>{categoryLabel(p.category)}</span>
                              </div>

                              <p className="mt-2 text-base font-semibold text-gray-900 line-clamp-1">
                                {title}
                              </p>
                              <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                                {excerpt(content)}
                              </p>

                              {p.tags.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {p.tags.slice(0, 3).map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {p.tags.length > 3 ? (
                                    <span className="text-xs font-semibold text-gray-500">
                                      +{p.tags.length - 3}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                                <span>{p.authorName}</span>
                                <span>·</span>
                                <span>{formatRelativeTime(p.createdAt)}</span>
                                <span>·</span>
                                <span>{tr(`댓글 ${p.commentsCount}`, `コメント ${p.commentsCount}`)}</span>
                                <span>·</span>
                                <span>{tr(`좋아요 ${p.likes}`, `いいね ${p.likes}`)}</span>
                              </div>
                            </div>

                            <div className="shrink-0 text-xs text-gray-400">→</div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </main>

          <aside className="lg:col-span-2 lg:sticky lg:top-[92px] h-fit space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <SectionTitle>{tr("인기글", "人気投稿")}</SectionTitle>
              <p className="mt-1 text-xs text-gray-500">
                {tr("좋아요와 댓글을 기준으로 정렬됩니다.", "いいねとコメントを基準に並び替えます。")}
              </p>

              <div className="mt-4 space-y-3">
                {trending.length === 0 ? (
                  <p className="text-sm text-gray-600">{tr("표시할 글이 없습니다.", "表示する投稿がありません。")}</p>
                ) : (
                  trending.map((t) => {
                    const title = tr(t.title, t.titleJp ?? t.title);
                    return (
                      <Link
                        key={t.id}
                        href={`/community/${t.id}`}
                        className="block rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 transition"
                      >
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{title}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span>{categoryLabel(t.category)}</span>
                          <span>·</span>
                          <span>{tr(`좋아요 ${t.likes}`, `いいね ${t.likes}`)}</span>
                          <span>·</span>
                          <span>{tr(`댓글 ${t.commentsCount}`, `コメント ${t.commentsCount}`)}</span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
