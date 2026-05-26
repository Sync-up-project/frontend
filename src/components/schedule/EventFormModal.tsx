"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CalendarEventsSummaryMember,
  CreateProjectCalendarEventRequest,
  ProjectCalendarEvent,
  UpdateProjectCalendarEventRequest,
} from "@/lib/types/schedule";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"] as const;
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TYPE_OPTIONS = ["TASK", "MILESTONE", "MEETING"] as const;

function labelType(v: string) {
  const k = String(v).toUpperCase();
  if (k === "TASK") return "작업";
  if (k === "MILESTONE") return "마일스톤";
  if (k === "MEETING") return "회의";
  return v;
}

function labelStatus(v: string) {
  const k = String(v).toUpperCase();
  if (k === "TODO") return "시작 전";
  if (k === "IN_PROGRESS") return "진행 중";
  if (k === "REVIEW") return "검토 중";
  if (k === "BLOCKED") return "막힘";
  if (k === "DONE") return "완료";
  return v;
}

function labelPriority(v: string) {
  const k = String(v).toUpperCase();
  if (k === "LOW") return "낮음";
  if (k === "MEDIUM") return "보통";
  if (k === "HIGH") return "높음";
  if (k === "URGENT") return "긴급";
  return v;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromDatetimeLocalToIso(value: string): string {
  const d = new Date(value);
  return d.toISOString();
}

function clampProgress(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function EventFormModal({
  open,
  mode,
  initial,
  members,
  currentUserId,
  restrictedToAssigneeFields,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: ProjectCalendarEvent | null;
  members: CalendarEventsSummaryMember[];
  currentUserId: string | null;
  restrictedToAssigneeFields?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectCalendarEventRequest | UpdateProjectCalendarEventRequest) => void;
  submitting?: boolean;
}) {
  const defaults = useMemo(() => {
    const now = new Date();
    const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      title: "",
      description: "",
      memo: "",
      startLocal: toDatetimeLocalValue(now.toISOString()),
      endLocal: toDatetimeLocalValue(inOneDay.toISOString()),
      status: "TODO",
      priority: "MEDIUM",
      type: "TASK",
      progress: 0,
      assigneeIds: currentUserId ? [currentUserId] : [],
    } as const;
  }, [currentUserId]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("TODO");
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>("MEDIUM");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("TASK");
  const [progress, setProgress] = useState(0);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setTitle(initial.title ?? "");
      setDescription(initial.description ?? "");
      setMemo(initial.memo ?? "");
      setStartLocal(toDatetimeLocalValue(initial.startAt));
      setEndLocal(toDatetimeLocalValue(initial.endAt));
      setStatus((STATUS_OPTIONS as readonly string[]).includes(initial.status) ? (initial.status as any) : "TODO");
      setPriority(
        (PRIORITY_OPTIONS as readonly string[]).includes(initial.priority) ? (initial.priority as any) : "MEDIUM",
      );
      setType((TYPE_OPTIONS as readonly string[]).includes(initial.type) ? (initial.type as any) : "TASK");
      setProgress(clampProgress(Number(initial.progress ?? 0)));
      setAssigneeIds((initial.assignees ?? []).map((a) => a.userId).filter(Boolean));
    } else {
      setTitle(defaults.title);
      setDescription(defaults.description);
      setMemo(defaults.memo);
      setStartLocal(defaults.startLocal);
      setEndLocal(defaults.endLocal);
      setStatus(defaults.status);
      setPriority(defaults.priority);
      setType(defaults.type);
      setProgress(defaults.progress);
      setAssigneeIds(defaults.assigneeIds.slice());
    }
  }, [open, mode, initial, defaults]);

  if (!open) return null;

  const canSubmit = Boolean(title.trim() && startLocal && endLocal);
  const restricted = Boolean(restrictedToAssigneeFields && mode === "edit");
  const showProgressControls = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-gray-900">
              {mode === "create" ? "새 작업 추가" : "작업 수정"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Chip tone="indigo">{labelType(type)}</Chip>
              <Chip tone="gray">{labelStatus(status)}</Chip>
              <Chip tone="gray">{labelPriority(priority)}</Chip>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div className="grid gap-4 px-5 py-4 text-sm">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-gray-600">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={restricted}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="예: DB 설계"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold text-gray-600">설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={restricted}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="작업 범위/정의/완료 조건 (선택)"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-gray-600">시작일</span>
              <input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                disabled={restricted}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-gray-600">마감일</span>
              <input
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                disabled={restricted}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-gray-600">유형</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={restricted}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {TYPE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {labelType(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-gray-600">상태</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {STATUS_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {labelStatus(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-gray-600">우선순위</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                disabled={restricted}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {PRIORITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {labelPriority(v)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={`grid gap-3 ${showProgressControls ? "sm:grid-cols-2" : ""}`}>
            {showProgressControls ? (
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-gray-600">진행률</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => setProgress(clampProgress(Number(e.target.value)))}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => setProgress(clampProgress(Number(e.target.value)))}
                    className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </label>
            ) : null}

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-gray-600">담당자(복수)</span>
              <select
                multiple
                value={assigneeIds}
                onChange={(e) => {
                  const next = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setAssigneeIds(next);
                }}
                disabled={restricted}
                className="h-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {(m.nickname ?? m.email ?? m.userId) + (m.position ? ` · ${m.position}` : "")}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-gray-500">Ctrl/⌘ 로 다중 선택 가능</div>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-semibold text-gray-600">메모</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="진행 메모/이슈/링크 (선택)"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            disabled={submitting || !canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              const base: CreateProjectCalendarEventRequest | UpdateProjectCalendarEventRequest = restricted
                ? ({
                    status,
                    progress: clampProgress(progress),
                    memo: memo.trim() ? memo.trim() : null,
                  } satisfies UpdateProjectCalendarEventRequest)
                : ({
                    title: title.trim(),
                    description: description.trim() ? description.trim() : null,
                    memo: memo.trim() ? memo.trim() : null,
                    startAt: fromDatetimeLocalToIso(startLocal),
                    endAt: fromDatetimeLocalToIso(endLocal),
                    type,
                    status,
                    priority,
                    progress: showProgressControls ? clampProgress(progress) : 0,
                    assigneeIds,
                  } satisfies CreateProjectCalendarEventRequest);
              onSubmit(base);
            }}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
