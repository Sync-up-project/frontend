"use client";

import React, { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export type SidebarProject = {
  id: string;
  title: string;
  membersText: string; // 예: "2/5명" 또는 "2/5名"
  tags: string[];
};

type Props = {
  recommended: SidebarProject[];
  bookmarked: SidebarProject[];
};

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-gray-900 break-words">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs font-medium text-gray-500 break-words">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

function MiniProject({ p }: { p: SidebarProject }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 min-w-0">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate min-w-0">
          {p.title}
        </p>
        <p className="text-xs font-semibold text-gray-600 shrink-0">
          {p.membersText}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {p.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProjectSidebar({ recommended, bookmarked }: Props) {
  const { tr } = useI18n();

  const hasRecommended = recommended.length > 0;
  const hasBookmarked = bookmarked.length > 0;

  const recommendedCountLabel = useMemo(
    () => `${recommended.length}${tr("개", "件")}`,
    [recommended.length, tr]
  );

  const bookmarkedCountLabel = useMemo(
    () => `${bookmarked.length}${tr("개", "件")}`,
    [bookmarked.length, tr]
  );

  return (
    <div className="space-y-5 min-w-0">
      {/* ✅ 추천 카드 */}
      <Card
        title={tr(
          "추천 프로젝트",
          "選択したスタックに近いプロジェクトを優先表示します。"
        )}
        right={
          hasRecommended ? (
            <div className="text-xs font-semibold text-gray-700 whitespace-nowrap">
              {tr("추천 프로젝트", "おすすめプロジェクト")}{" "}
              <span className="ml-1">{recommendedCountLabel}</span>
            </div>
          ) : null
        }
      >
        <p className="text-xs text-gray-500 leading-relaxed break-words line-clamp-6">
          {tr(
            "선택한 스택과 유사한 프로젝트를 우선적으로 보여드립니다.",
            "選択したスタックに近いプロジェクトを優先的に表示します。"
          )}
        </p>

        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-colors"
        >
          {tr("추천 프로젝트 더보기", "おすすめをもっと見る")}
        </button>

        <div className="mt-4 space-y-3 min-w-0">
          {recommended.map((p) => (
            <MiniProject key={p.id} p={p} />
          ))}
        </div>
      </Card>

      {/* ✅ 찜 카드 */}
      <Card
        title={tr("내가 찜한 프로젝트", "お気に入りのプロジェクト")}
        subtitle={tr(
          "직무목록에서 빠르게 비교하고, 바로 참여로 이동합니다.",
          "職種リストで素早く比較し、そのまま参加へ進めます。"
        )}
        right={
          hasBookmarked ? (
            <div className="text-xs font-semibold text-gray-700 whitespace-nowrap">
              {tr("찜한 프로젝트", "お気に入り")}{" "}
              <span className="ml-1">{bookmarkedCountLabel}</span>
            </div>
          ) : null
        }
      >
        <button
          type="button"
          className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-colors"
        >
          {tr("찜 목록 보기", "お気に入り一覧")}
        </button>

        <div className="mt-4 space-y-3 min-w-0">
          {bookmarked.map((p) => (
            <MiniProject key={p.id} p={p} />
          ))}
        </div>
      </Card>
    </div>
  );
}
