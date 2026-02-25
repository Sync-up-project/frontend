"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, ThumbsUp } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { getAccessToken } from "@/lib/auth";
import {
  apiGetCommunityPosts,
  apiToUiPostCategory,
  uiToApiPostCategory,
  pickArray,
  type UiPostCategory,
  type PostCategory,
} from "@/lib/api";
import { alertAndPushLogin } from "@/lib/requireLogin";

type CategoryTab = "all" | UiPostCategory;
type SortKey = "latest" | "popular" | "commented";

type PostRow = {
  id: string;
  category: UiPostCategory;
  title: string;
  authorNickname: string;
  createdAt: string;
  commentCount: number;
  likeCount: number;
  viewCount: number;
};

function isCategoryTab(v: string | null): v is CategoryTab {
  return v === "all" || v === "free" || v === "question" || v === "share" || v === "review";
}

function normalizePost(raw: any): PostRow {
  const category = apiToUiPostCategory(raw?.category);
  return {
    id: String(raw?.id ?? ""),
    category,
    title: String(raw?.title ?? raw?.titleOriginal ?? ""),
    authorNickname: String(raw?.authorNickname ?? raw?.author?.nickname ?? ""),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    commentCount: Number(raw?.commentCount ?? raw?.commentsCount ?? 0),
    likeCount: Number(raw?.likeCount ?? raw?.likes ?? 0),
    viewCount: Number(raw?.viewCount ?? raw?.views ?? 0),
  };
}

function uiTabToApiCategory(tab: CategoryTab): PostCategory | undefined {
  if (tab === "all") return undefined;
  return uiToApiPostCategory(tab);
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;

  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);

  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(hour / 24);
  if (day < 30) return `${day}일 전`;

  return iso.slice(0, 10);
}

function categoryPill(active: boolean) {
  return [
    "rounded-full px-3 py-1 text-sm font-semibold transition-colors",
    active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
  ].join(" ");
}

function sortPill(active: boolean) {
  return [
    "rounded-lg px-3 py-2 text-sm font-semibold border transition-colors",
    active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  ].join(" ");
}

function rowCategoryText(c: UiPostCategory) {
  switch (c) {
    case "free":
      return "자유";
    case "question":
      return "QnA";
    case "share":
      return "정보 공유";
    case "review":
      return "후기";
    default:
      return "전체";
  }
}

export default function CommunityClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const { tr } = useI18n();

  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    const sync = () => setIsAuthed(Boolean(getAccessToken()));
    sync();
    window.addEventListener("auth:changed", sync);
    return () => window.removeEventListener("auth:changed", sync);
  }, []);

  const initialTab = sp.get("tab");
  const [tab, setTab] = useState<CategoryTab>(isCategoryTab(initialTab) ? initialTab : "all");
  const [sortBy, setSortBy] = useState<SortKey>("latest");

  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const category = uiTabToApiCategory(tab);
        const res = await apiGetCommunityPosts({ category, limit: 50, offset: 0 });
        const list = pickArray<any>(res).map(normalizePost);

        const sorted = [...list];
        if (sortBy === "latest") sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        else if (sortBy === "popular") sorted.sort((a, b) => b.likeCount - a.likeCount);
        else sorted.sort((a, b) => b.commentCount - a.commentCount);

        if (mounted) setRows(sorted);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tab, sortBy]);

  useEffect(() => {
    const usp = new URLSearchParams();
    usp.set("tab", tab);
    router.replace(`/community?${usp.toString()}`);
  }, [tab, router]);

  function onClickWrite() {
    if (isAuthed) {
      router.push(tab === "all" ? "/community/new" : `/community/new?category=${tab}`);
      return;
    }
    alertAndPushLogin(router, tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{tr("커뮤니티", "コミュニティ")}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {tr("질문/정보/후기를 공유해보세요.", "質問・情報・レビューを共有しましょう。")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClickWrite}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {tr("작성하기", "作成")}
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "free", "question", "share", "review"] as CategoryTab[]).map((t) => (
              <button key={t} type="button" className={categoryPill(tab === t)} onClick={() => setTab(t)}>
                {t === "all" ? tr("전체", "全体") : tr(rowCategoryText(t as UiPostCategory), rowCategoryText(t as UiPostCategory))}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{tr("정렬", "並び替え")}</span>
            <button type="button" className={sortPill(sortBy === "latest")} onClick={() => setSortBy("latest")}>
              {tr("최신순", "最新順")}
            </button>
            <button type="button" className={sortPill(sortBy === "popular")} onClick={() => setSortBy("popular")}>
              {tr("인기순", "人気順")}
            </button>
            <button type="button" className={sortPill(sortBy === "commented")} onClick={() => setSortBy("commented")}>
              {tr("댓글순", "コメント順")}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[1fr_120px_90px_90px_90px] gap-2 border-b border-gray-200 px-4 py-3 text-xs font-bold text-gray-500">
            <div>{tr("제목", "タイトル")}</div>
            <div className="text-center">{tr("작성자", "作成者")}</div>
            <div className="text-center">{tr("댓글", "コメント")}</div>
            <div className="text-center">{tr("좋아요", "いいね")}</div>
            <div className="text-center">{tr("조회", "閲覧")}</div>
          </div>

          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-gray-600">{tr("불러오는 중...", "読み込み中...")}</div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-600">{tr("게시글이 없습니다.", "投稿がありません。")}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-4 hover:bg-gray-50">
                  <Link href={`/community/${r.id}`} className="grid grid-cols-[1fr_120px_90px_90px_90px] gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          {tr(rowCategoryText(r.category), rowCategoryText(r.category))}
                        </span>
                        <span className="truncate text-sm font-semibold text-gray-900">{r.title}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{formatRelative(r.createdAt)}</div>
                    </div>

                    <div className="flex items-center justify-center text-sm text-gray-700">{r.authorNickname || "-"}</div>
                    <div className="flex items-center justify-center text-sm text-gray-700">{r.commentCount}</div>
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-700">
                      <ThumbsUp size={14} className="text-gray-400" />
                      <span>{r.likeCount}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-700">
                      <Eye size={14} className="text-gray-400" />
                      <span>{r.viewCount}</span>
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