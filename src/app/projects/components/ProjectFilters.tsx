// src/app/projects/components/ProjectFilters.tsx
"use client";

import React, { useMemo, useState } from "react";
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 7.5L10 12l4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { tr } = useI18n();

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} ${tr("제거", "削除")}`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-indigo-700/90 hover:bg-indigo-100 hover:text-indigo-800"
      >
        <span aria-hidden="true" className="leading-none">
          ×
        </span>
      </button>
    </span>
  );
}

function SelectRow({
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
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
          : "bg-white text-gray-800 hover:bg-gray-50 ring-1 ring-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function TogglePill({
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
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4"
      >
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-gray-900">{title}</p>
          <p className="mt-1 text-xs font-medium text-gray-500">{subtitle}</p>
        </div>
        <span className="text-gray-500">
          <Chevron open={open} />
        </span>
      </button>

      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
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

  const [openPosition, setOpenPosition] = useState(true);
  const [openStacks, setOpenStacks] = useState(false);
  const [openTools, setOpenTools] = useState(false);

  const positionLabelOf = (pos: DevPosition) => {
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
  };

  const positionLabel = useMemo(
    () => positionLabelOf(safe.position),
    [safe.position]
  );

  const stacksSummary = useMemo(() => {
    if (safe.stacks.length === 0) return tr("선택 없음", "未選択");
    if (safe.stacks.length === 1) return safe.stacks[0];
    return `${safe.stacks[0]}${tr(" 외 ", " ほか ")}${
      safe.stacks.length - 1
    }${tr("개", "件")}`;
  }, [safe.stacks, tr]);

  const toolsSummary = useMemo(() => {
    if (safe.tools.length === 0) return tr("선택 없음", "未選択");
    if (safe.tools.length === 1) return safe.tools[0];
    return `${safe.tools[0]}${tr(" 외 ", " ほか ")}${
      safe.tools.length - 1
    }${tr("개", "件")}`;
  }, [safe.tools, tr]);

  const chips = useMemo(() => {
    const result: { key: string; label: string; onRemove: () => void }[] = [];

    if (safe.position !== "all") {
      result.push({
        key: `pos:${safe.position}`,
        label: positionLabel,
        onRemove: () => onChange({ ...safe, position: "all" }),
      });
    }

    safe.stacks.forEach((s) => {
      result.push({
        key: `stack:${s}`,
        label: s,
        onRemove: () =>
          onChange({ ...safe, stacks: safe.stacks.filter((x) => x !== s) }),
      });
    });

    safe.tools.forEach((t) => {
      result.push({
        key: `tool:${t}`,
        label: t,
        onRemove: () =>
          onChange({ ...safe, tools: safe.tools.filter((x) => x !== t) }),
      });
    });

    return result;
  }, [safe, onChange, positionLabel]);

  function resetAll() {
    onChange({ position: "all", stacks: [], tools: [] });
  }

  function setPosition(pos: DevPosition) {
    onChange({ ...safe, position: pos });
    setOpenPosition(false);
  }

  function toggleStack(s: string) {
    const next = safe.stacks.includes(s)
      ? safe.stacks.filter((x) => x !== s)
      : [...safe.stacks, s];
    onChange({ ...safe, stacks: next });
  }

  function toggleTool(t: string) {
    const next = safe.tools.includes(t)
      ? safe.tools.filter((x) => x !== t)
      : [...safe.tools, t];
    onChange({ ...safe, tools: next });
  }

  return (
    <div className="space-y-3">
      <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-gray-900">
            {tr("필터", "フィルター")}
          </h2>
        </div>

        {chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {chips.map((c) => (
              <Chip key={c.key} label={c.label} onRemove={c.onRemove} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs font-medium text-gray-500">
            {tr("선택된 필터가 없습니다.", "選択されたフィルターはありません。")}
          </p>
        )}

        <div className="mt-5 space-y-4">
          <Section
            title={tr("개발 직무", "開発職種")}
            subtitle={positionLabel}
            open={openPosition}
            onToggle={() => setOpenPosition((v) => !v)}
          >
            <div className="space-y-2">
              {POSITIONS.map((p) => (
                <SelectRow
                  key={p}
                  label={positionLabelOf(p)}
                  active={safe.position === p}
                  onClick={() => setPosition(p)}
                />
              ))}
            </div>
          </Section>

          <Section
            title={tr("기술 스택", "技術スタック")}
            subtitle={stacksSummary}
            open={openStacks}
            onToggle={() => setOpenStacks((v) => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {PROJECT_FILTER_STACKS.map((s) => (
                <TogglePill
                  key={s}
                  label={s}
                  active={safe.stacks.includes(s)}
                  onClick={() => toggleStack(s)}
                />
              ))}
            </div>
          </Section>

          <Section
            title={tr("협업 도구", "協業ツール")}
            subtitle={toolsSummary}
            open={openTools}
            onToggle={() => setOpenTools((v) => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {PROJECT_FILTER_TOOLS.map((t) => (
                <TogglePill
                  key={t}
                  label={t}
                  active={safe.tools.includes(t)}
                  onClick={() => toggleTool(t)}
                />
              ))}
            </div>
          </Section>
        </div>
      </aside>

      <button
        type="button"
        onClick={resetAll}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
      >
        {tr("초기화", "リセット")}
      </button>
    </div>
  );
}
