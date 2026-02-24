"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, ThumbsUp } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  apiGetCommunityPosts,
  apiToUiPostCategory,
  uiToApiPostCategory,
  pickArray,
  type UiPostCategory,
  type PostCategory,
} from "@/lib/api";

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
  if (min < 1) return "방금";
  if (min < 60) return `${min}분`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일`;
  return new Date(iso).toLocaleDateString();
}

function categoryPill(selected: boolean) {
  const base =
    "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold border transition";
  return selected
    ? `${base} bg-gray-900 text-white border-gray-900`
    : `${base} bg-white text-gray-700 border-gray-200 hover:bg-gray-50`;
}

function rowCategoryBadge(cat: UiPostCategory) {
  const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold";
  switch (cat) {
    case "question":
      return `${base} border-blue-200 bg-blue-50 text-blue-700`;
    case "share":
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
    case "review":
      return `${base} border-amber-200 bg-amber-50 text-amber-700`;
    case "free":
    default:
      return `${base} border-gray-200 bg-gray-50 text-gray-700`;
  }
}

function rowCategoryText(cat: UiPostCategory) {
  switch (cat) {
    case "question":
      return "QnA";
    case "share":
      return "정보";
    case "review":
      return "후기";
    case "free":
    default:
      return "자유";
  }
}

export default function CommunityClient() {
  const { tr } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();

  const [tab, setTab] = useState<CategoryTab>("all");
  const [sortBy, setSortBy] = useState<SortKey>("latest");

  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (선택) URL 반영용: 기존처럼 tab만 읽어오고 싶으면 유지
  useEffect(() => {
    const qTab = sp.get("tab");
    if (isCategoryTab(qTab)) setTab(qTab);
  }, [sp]);

  // 목록 fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const apiCategory = uiTabToApiCategory(tab);
        const res = await apiGetCommunityPosts({
          category: apiCategory as any,
          sortBy,
          limit: 50,
          offset: 0,
        });

        const list = pickArray(res?.posts ?? res).map(normalizePost);
        if (mounted) setRows(list);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Internal server error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tab, sortBy]);

  // 탭 변경 시 URL도 갱신(원치 않으면 제거 가능)
  useEffect(() => {
    const usp = new URLSearchParams();
    usp.set("tab", tab);
    router.replace(`/community?${usp.toString()}`);
  }, [tab, router]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {tr("커뮤니티", "コミュニティ")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {tr("질문/정보/후기를 공유해보세요.", "質問・情報・レビューを共有しましょう。")}
            </p>
          </div>

          <Link
            href={tab === "all" ? "/community/new" : `/community/new?category=${tab}`}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {tr("작성하기", "作成")}
          </Link>
        </div>

        {/* Category Tabs + Sort */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "free", "question", "share", "review"] as CategoryTab[]).map((t) => (
              <button
                key={t}
                type="button"
                className={categoryPill(tab === t)}
                onClick={() => setTab(t)}
              >
                {t === "all"
                  ? tr("전체", "全体")
                  : tr(rowCategoryText(t as UiPostCategory), rowCategoryText(t as UiPostCategory))}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{tr("정렬", "並び替え")}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="latest">{tr("최신순", "新着順")}</option>
              <option value="popular">{tr("인기순", "人気順")}</option>
              <option value="commented">{tr("댓글순", "コメント順")}</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="px-4 py-10 text-center text-sm text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              {tr("게시글이 없습니다.", "投稿がありません。")}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-12 md:col-span-8 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={rowCategoryBadge(r.category)}>{rowCategoryText(r.category)}</span>

                        {/* ✅ 제목 hover 애니메이션 강화: group + underline slide */}
                        <Link
                          href={`/community/${r.id}`}
                          className="group min-w-0 flex-1"
                        >
                          <span
                            className={[
                              "block truncate text-sm font-semibold",
                              "text-gray-900 transition-all duration-200",
                              "group-hover:text-blue-700 group-hover:translate-x-[1px]",
                            ].join(" ")}
                          >
                            {r.title}
                          </span>

                          {/* underline slide */}
                          <span className="relative -mt-0.5 block h-[2px] w-full overflow-hidden">
                            <span
                              className={[
                                "absolute left-0 top-0 h-[2px] w-full",
                                "bg-blue-600",
                                "translate-x-[-100%] opacity-0",
                                "transition-all duration-300 ease-out",
                                "group-hover:translate-x-0 group-hover:opacity-100",
                              ].join(" ")}
                            />
                          </span>
                        </Link>

                        {r.commentCount > 0 && (
                          <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-600">
                            {r.commentCount}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {r.authorNickname || tr("익명", "匿名")} · {formatRelative(r.createdAt)}
                      </div>
                    </div>

                    {/* Icons 영역 */}
                    <div className="col-span-12 md:col-span-4 flex justify-end gap-6 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Eye size={14} strokeWidth={1.5} className="text-gray-400" />
                        <span>{r.viewCount}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <ThumbsUp
                          size={14}
                          strokeWidth={1.5}
                          className={r.likeCount > 0 ? "text-blue-600" : "text-gray-400"}
                        />
                        <span>{r.likeCount}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}