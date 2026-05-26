// src/app/projects/components/ProjectSidebar.tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export type SidebarProject = {
  id: string;
  title: string;
  membersText?: string;
  tags?: string[];
};

type Props = {
  recommended: SidebarProject[];
  bookmarked: SidebarProject[];
  // ✅ 핵심: ProjectsClient에서 넘기는 loading을 Props에 추가
  loading?: boolean;
};

export default function ProjectSidebar({ recommended, bookmarked, loading = false }: Props) {
  const { tr } = useI18n();

  return (
    <div className="space-y-4">
      {/* 추천 프로젝트 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-white/5 dark:border-white/10">
        <p className="text-sm font-extrabold text-gray-900 dark:text-white">
          {tr("추천 프로젝트", "おすすめプロジェクト")}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-white/60">
          {tr(
            "선택한 스택과 유사한 프로젝트를 우선적으로 보여드립니다.",
            "選択したスタックに近いプロジェクトを優先表示します。"
          )}
        </p>

        <div className="mt-4">
          <Link
            href="/projects/recommend"
            aria-disabled={loading}
            className={[
              "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
              loading
                ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/40"
                : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90",
            ].join(" ")}
            onClick={(e) => {
              if (loading) e.preventDefault();
            }}
          >
            {loading
              ? tr("불러오는 중...", "読み込み中...")
              : tr("추천 프로젝트 더보기", "おすすめをもっと見る")}
          </Link>
        </div>
      </div>

      {/* 내가 찜한 프로젝트 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-white/5 dark:border-white/10">
        <p className="text-sm font-extrabold text-gray-900 dark:text-white">
          {tr("내가 찜한 프로젝트", "お気に入りプロジェクト")}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-white/60">
          {tr(
            "직무목록에서 빠르게 비교하고, 바로 참여로 이동합니다.",
            "職種一覧からすぐ比較し、参加へ移動できます。"
          )}
        </p>

        <div className="mt-4">
          <Link
            href="/projects/wishlist"
            aria-disabled={loading}
            className={[
              "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
              loading
                ? "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-white/40"
                : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90",
            ].join(" ")}
            onClick={(e) => {
              if (loading) e.preventDefault();
            }}
          >
            {loading ? tr("불러오는 중...", "読み込み中...") : tr("찜 목록 보기", "お気に入りを見る")}
          </Link>
        </div>
      </div>
    </div>
  );
}
