// src/app/projects/components/ProjectFilters.tsx
"use client";

import React, { useCallback, useMemo } from "react";
import { Check, RotateCcw, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  PROJECT_FILTER_STACKS,
  PROJECT_FILTER_TOOLS,
} from "@/lib/constants/projectFilterOptions";

export type DevPosition =
  | "all"
  | "frontend"
  | "backend"
  | "fullstack"
  | "mobile"
  | "devops"
  | "data"
  | "ai";

export type FilterState = {
  position: DevPosition;
  stacks: string[];
  tools: string[];
};

type Props = {
  value: FilterState;
  onChange: (next: FilterState) => void;
};

const POSITIONS: DevPosition[] = [
  "all",
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "devops",
  "data",
  "ai",
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function FilterGroup({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-gray-200 px-4 py-5 first:border-t-0 dark:border-white/10 sm:px-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-white/55">{hint}</p>
        </div>
        {typeof count === "number" && count > 0 ? (
          <span className="shrink-0 rounded-md bg-gray-950 px-2 py-1 text-xs font-bold text-white dark:bg-white dark:text-gray-950">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SelectedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { tr } = useI18n();

  return (
    <span className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-xs font-bold text-blue-800 dark:border-sky-300/30 dark:bg-sky-300/10 dark:text-sky-100">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} ${tr("제거", "削除")}`}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-sky-100 dark:hover:bg-white/10"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

function PositionButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "flex min-h-10 items-center justify-center rounded-md border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500",
        active
          ? "border-gray-950 bg-gray-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-gray-950"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75 dark:hover:bg-white/10"
      )}
    >
      {label}
    </button>
  );
}

function OptionChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 max-w-full items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm dark:border-sky-300 dark:bg-sky-300 dark:text-gray-950"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75 dark:hover:bg-white/10"
      )}
    >
      {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function ProjectFilters({ value, onChange }: Props) {
  const { tr } = useI18n();

  const safe = useMemo<FilterState>(() => {
    return {
      position: value?.position ?? "all",
      stacks: Array.isArray(value?.stacks) ? value.stacks : [],
      tools: Array.isArray(value?.tools) ? value.tools : [],
    };
  }, [value]);

  const positionLabelOf = useCallback((pos: DevPosition) => {
    switch (pos) {
      case "frontend":
        return tr("프론트엔드", "フロントエンド");
      case "backend":
        return tr("백엔드", "バックエンド");
      case "fullstack":
        return tr("풀스택", "フルスタック");
      case "mobile":
        return tr("모바일", "モバイル");
      case "devops":
        return "DevOps";
      case "data":
        return tr("데이터", "データ");
      case "ai":
        return "AI/ML";
      case "all":
      default:
        return tr("전체", "全体");
    }
  }, [tr]);

  const selectedFilters = useMemo(() => {
    const result: { key: string; label: string; onRemove: () => void }[] = [];

    if (safe.position !== "all") {
      result.push({
        key: `pos:${safe.position}`,
        label: positionLabelOf(safe.position),
        onRemove: () => onChange({ ...safe, position: "all" }),
      });
    }

    safe.stacks.forEach((stack) => {
      result.push({
        key: `stack:${stack}`,
        label: stack,
        onRemove: () =>
          onChange({ ...safe, stacks: safe.stacks.filter((item) => item !== stack) }),
      });
    });

    safe.tools.forEach((tool) => {
      result.push({
        key: `tool:${tool}`,
        label: tool,
        onRemove: () =>
          onChange({ ...safe, tools: safe.tools.filter((item) => item !== tool) }),
      });
    });

    return result;
  }, [safe, onChange, positionLabelOf]);

  const activeCount = selectedFilters.length;

  function resetAll() {
    onChange({ position: "all", stacks: [], tools: [] });
  }

  function setPosition(position: DevPosition) {
    onChange({ ...safe, position });
  }

  function toggleStack(stack: string) {
    onChange({
      ...safe,
      stacks: safe.stacks.includes(stack)
        ? safe.stacks.filter((item) => item !== stack)
        : [...safe.stacks, stack],
    });
  }

  function toggleTool(tool: string) {
    onChange({
      ...safe,
      tools: safe.tools.includes(tool)
        ? safe.tools.filter((item) => item !== tool)
        : [...safe.tools, tool],
    });
  }

  return (
    <aside className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-gray-950 dark:text-white">
              {tr("프로젝트 필터", "プロジェクトフィルター")}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-white/55">
              {activeCount > 0
                ? tr(`${activeCount}개 조건 적용 중`, `${activeCount}件の条件を適用中`)
                : tr("조건을 선택해 목록을 좁혀보세요.", "条件を選んで一覧を絞り込みましょう。")}
            </p>
          </div>

          <button
            type="button"
            onClick={resetAll}
            disabled={activeCount === 0}
            className={cx(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500",
              activeCount === 0
                ? "cursor-not-allowed border-gray-200 bg-white text-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-white/25"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-white/15 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {tr("초기화", "リセット")}
          </button>
        </div>

        {selectedFilters.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedFilters.map((filter) => (
              <SelectedChip key={filter.key} label={filter.label} onRemove={filter.onRemove} />
            ))}
          </div>
        ) : null}
      </div>

      <FilterGroup
        title={tr("개발 직무", "開発職種")}
        hint={tr("하나의 주요 역할을 선택합니다.", "主な役割を1つ選択します。")}
      >
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
          {POSITIONS.map((position) => (
            <PositionButton
              key={position}
              label={positionLabelOf(position)}
              active={safe.position === position}
              onClick={() => setPosition(position)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title={tr("기술 스택", "技術スタック")}
        hint={tr("프로젝트 태그에 포함된 기술을 고릅니다.", "プロジェクトタグに含まれる技術を選びます。")}
        count={safe.stacks.length}
      >
        <div className="flex flex-wrap gap-2">
          {PROJECT_FILTER_STACKS.map((stack) => (
            <OptionChip
              key={stack}
              label={stack}
              active={safe.stacks.includes(stack)}
              onClick={() => toggleStack(stack)}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup
        title={tr("협업 도구", "協業ツール")}
        hint={tr("사용 경험이 필요한 도구를 선택합니다.", "利用経験が必要なツールを選びます。")}
        count={safe.tools.length}
      >
        <div className="flex flex-wrap gap-2">
          {PROJECT_FILTER_TOOLS.map((tool) => (
            <OptionChip
              key={tool}
              label={tool}
              active={safe.tools.includes(tool)}
              onClick={() => toggleTool(tool)}
            />
          ))}
        </div>
      </FilterGroup>
    </aside>
  );
}
