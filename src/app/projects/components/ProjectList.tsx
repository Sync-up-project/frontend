// src/app/projects/components/ProjectList.tsx
"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export type ProjectItem = {
  id: string;
  title: string;
  description: string;
  position: string;
  tags: string[];
  currentCount: number;
  totalCount: number;
};

type Props = {
  // ✅ 방어: undefined 가능
  projects?: ProjectItem[];
};

function PositionBadge({ position }: { position: string }) {
  const { tr } = useI18n();
  const base = "inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold";

  const key = (position ?? "").toLowerCase();

  const className =
    key === "frontend"
      ? "bg-blue-100 text-blue-700"
      : key === "backend"
      ? "bg-indigo-100 text-indigo-700"
      : key === "fullstack"
      ? "bg-slate-100 text-slate-700"
      : key === "mobile"
      ? "bg-purple-100 text-purple-700"
      : key === "devops"
      ? "bg-emerald-100 text-emerald-700"
      : key === "data"
      ? "bg-amber-100 text-amber-700"
      : key === "ai"
      ? "bg-rose-100 text-rose-700"
      : "bg-gray-100 text-gray-700";

  const label =
    typeof position === "string" && position.trim().length > 0
      ? position
      : tr("전체", "全体");

  return <span className={`${base} ${className}`}>{label}</span>;
}

export default function ProjectList({ projects }: Props) {
  const { tr } = useI18n();

  // ✅ 핵심: UI 그대로, 크래시만 방지
  const list = Array.isArray(projects) ? projects : [];

  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 text-[11px] font-semibold text-gray-500">
        <div className="col-span-5">{tr("프로젝트", "プロジェクト")}</div>
        <div className="col-span-2">{tr("모집유형", "募集タイプ")}</div>
        <div className="col-span-4">{tr("개발언어 및 툴", "開発言語・ツール")}</div>
        <div className="col-span-1 text-right">{tr("모집인원", "募集人数")}</div>
      </div>

      {list.length === 0 ? (
        <div className="p-6 text-sm text-gray-600">
          {tr("표시할 프로젝트가 없습니다.", "表示できるプロジェクトがありません。")}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {list.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block px-5 py-4 hover:bg-gray-50 transition"
            >
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-12 md:col-span-5">
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">{p.description}</p>
                </div>

                <div className="col-span-6 md:col-span-2">
                  <PositionBadge position={p.position} />
                </div>

                <div className="col-span-6 md:col-span-4">
                  <div className="flex flex-wrap gap-2">
                    {(p.tags ?? []).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        {t}
                      </span>
                    ))}
                    {(p.tags ?? []).length > 3 ? (
                      <span className="text-xs text-gray-500">+{(p.tags ?? []).length - 3}</span>
                    ) : null}
                  </div>
                </div>

                <div className="col-span-12 md:col-span-1 text-right text-xs text-gray-700">
                  {p.currentCount}/{p.totalCount}
                  {tr("명", "名")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}