"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchCurrentUser,
  getAccessToken,
  getCurrentUser,
  refreshAccessToken,
} from "@/lib/auth";
import type {
  CalendarEventsSummaryMember,
  CreateProjectCalendarEventRequest,
  GetProjectCalendarEventsResponse,
  GetProjectCalendarEventsSummaryResponse,
  ProjectCalendarEvent,
  UpdateProjectCalendarEventRequest,
} from "@/lib/types/schedule";
import EventFormModal from "./EventFormModal";
import MemberProgressModal from "./MemberProgressModal";

const STATUS_ORDER = ["IN_PROGRESS", "REVIEW", "TODO", "BLOCKED"] as const;
const PRIORITY_ORDER = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

function norm(v: string | null | undefined) {
  return String(v ?? "").trim().toUpperCase();
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function Badge({
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

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className="h-2 rounded-full bg-gray-900" style={{ width: `${v}%` }} />
    </div>
  );
}

function statusTone(status: string) {
  const s = norm(status);
  if (s === "DONE" || s === "COMPLETED" || s === "FINISHED") return "emerald" as const;
  if (s === "IN_PROGRESS") return "indigo" as const;
  if (s === "REVIEW") return "amber" as const;
  if (s === "BLOCKED") return "rose" as const;
  return "gray" as const;
}

function labelType(v: string) {
  const k = norm(v);
  if (k === "TASK") return "작업";
  if (k === "MILESTONE") return "마일스톤";
  if (k === "MEETING") return "회의";
  return v;
}

function labelStatus(v: string) {
  const k = norm(v);
  if (k === "TODO") return "시작 전";
  if (k === "IN_PROGRESS") return "진행 중";
  if (k === "REVIEW") return "검토 중";
  if (k === "BLOCKED") return "막힘";
  if (k === "DONE" || k === "COMPLETED" || k === "FINISHED") return "완료";
  if (k === "PLANNED") return "예정";
  return v;
}

function labelPriority(v: string) {
  const k = norm(v);
  if (k === "LOW") return "낮음";
  if (k === "MEDIUM") return "보통";
  if (k === "HIGH") return "높음";
  if (k === "URGENT") return "긴급";
  return v;
}

function priorityTone(priority: string) {
  const p = norm(priority);
  if (p === "URGENT") return "rose" as const;
  if (p === "HIGH") return "amber" as const;
  if (p === "MEDIUM") return "indigo" as const;
  return "gray" as const;
}

function pickAssigneeLabel(m: CalendarEventsSummaryMember) {
  return m.nickname ?? m.email ?? m.userId;
}

function SummaryCard({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: string | number;
  tone?: "gray" | "indigo" | "emerald" | "amber" | "rose";
}) {
  const ring: Record<string, string> = {
    gray: "border-gray-200",
    indigo: "border-indigo-200",
    emerald: "border-emerald-200",
    amber: "border-amber-200",
    rose: "border-rose-200",
  };
  return (
    <div className={`rounded-2xl border ${ring[tone]} bg-white px-4 py-3 shadow-sm`}>
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
      <div className="text-sm font-semibold text-gray-800">아직 등록된 작업이 없습니다.</div>
      <div className="mt-1 text-xs text-gray-500">프로젝트를 완성하기 위한 첫 작업을 추가해 보세요.</div>
      <button
        onClick={onCreate}
        className="mt-5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        새 작업 추가
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-gray-100 bg-gray-50" />
      ))}
    </div>
  );
}

function TaskCard({
  task,
  currentUserId,
  projectOwnerId,
  onEdit,
  onDelete,
}: {
  task: ProjectCalendarEvent;
  currentUserId: string | null;
  projectOwnerId: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOwner = Boolean(currentUserId && projectOwnerId && currentUserId === projectOwnerId);
  const isAuthor = Boolean(currentUserId && task.createdById && currentUserId === task.createdById);
  const canDelete = isOwner || isAuthor;

  const assignees = (task.assignees ?? [])
    .map((a) => a?.user?.nickname ?? a?.userId)
    .filter(Boolean)
    .join(", ");

  const showProgress = !(norm(task.status) === "TODO" && Number(task.progress ?? 0) <= 0);

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-bold text-gray-900">{task.title}</div>
            <Badge tone={statusTone(task.status)}>{labelStatus(task.status)}</Badge>
            <Badge tone={priorityTone(task.priority)}>{labelPriority(task.priority)}</Badge>
            {task.dueSoon ? <Badge tone="amber">마감 임박</Badge> : null}
            {task.overdue ? <Badge tone="rose">지연</Badge> : null}
          </div>
          {task.description ? (
            <div className="mt-1 line-clamp-2 text-sm text-gray-600">{task.description}</div>
          ) : (
            <div className="mt-1 text-xs text-gray-400">설명 없음</div>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          <button
            onClick={onEdit}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            수정
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            title={!canDelete ? "오너 또는 작성자만 삭제할 수 있어요." : "삭제"}
            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          담당자: <span className="font-semibold text-gray-800">{assignees || "-"}</span>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          시작: <span className="font-semibold text-gray-800">{formatDate(task.startAt)}</span>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          마감: <span className="font-semibold text-gray-800">{formatDate(task.endAt)}</span>
        </div>
      </div>

      {showProgress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>진행률</span>
            <span className="font-semibold text-gray-800">{Math.round(Number(task.progress ?? 0))}%</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={Number(task.progress ?? 0)} />
          </div>
        </div>
      ) : null}

      {task.memo ? (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap">
          {task.memo}
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectSchedule({ projectId }: { projectId: string }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(getCurrentUser()?.id ?? null);

  const [summary, setSummary] = useState<GetProjectCalendarEventsSummaryResponse | null>(null);
  const [members, setMembers] = useState<CalendarEventsSummaryMember[]>([]);
  const [events, setEvents] = useState<ProjectCalendarEvent[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);

  const [q, setQ] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [mineOnly, setMineOnly] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [includeDone, setIncludeDone] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyDueSoon, setOnlyDueSoon] = useState(false);
  const [sort, setSort] = useState<string>("DEFAULT");

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberModalTarget, setMemberModalTarget] = useState<CalendarEventsSummaryMember | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitial, setModalInitial] = useState<ProjectCalendarEvent | null>(null);
  const [restrictedEdit, setRestrictedEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const projectOwnerId = summary?.project?.ownerId ?? null;

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = getAccessToken();
      if (!token) throw new Error("Unauthorized");
      const res = await fetch(input, {
        ...init,
        headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status !== 401) return res;
      await refreshAccessToken();
      const token2 = getAccessToken();
      if (!token2) throw new Error("Unauthorized");
      return fetch(input, {
        ...init,
        headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token2}` },
        cache: "no-store",
      });
    },
    [],
  );

  useEffect(() => {
    const existing = getCurrentUser();
    if (existing?.id) {
      setCurrentUserId(existing.id);
      return;
    }
    if (!getAccessToken()) return;
    void fetchCurrentUser()
      .then((u) => setCurrentUserId(u.id))
      .catch(() => null);
  }, []);

  const refetchSummary = useCallback(async () => {
    setNoAccess(false);
    try {
      const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/calendar-events/summary`, { method: "GET" });
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (res.status === 403) {
        setNoAccess(true);
        setSummary(null);
        setMembers([]);
        return;
      }
      if (!res.ok) {
        const msg = (json && typeof json === "object" && (json.message || json.error)) || text || res.statusText;
        throw new Error(String(msg));
      }
      setSummary(json);
      setMembers(Array.isArray(json?.members) ? json.members : []);
    } catch (e) {
      setSummary(null);
      setMembers([]);
      throw e;
    }
  }, [authFetch, projectId]);

  const refetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoAccess(false);
    try {
      const params = new URLSearchParams();
      params.set("type", "TASK");
      if (q.trim()) params.set("q", q.trim());
      const effectiveAssigneeId = mineOnly ? currentUserId ?? "" : assigneeId;
      if (effectiveAssigneeId) params.set("assigneeId", effectiveAssigneeId);
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (includeDone) params.set("includeDone", "true");
      if (sort && sort !== "DEFAULT") params.set("sort", sort);

      const url = `/api/projects/${encodeURIComponent(projectId)}/calendar-events?${params.toString()}`;
      const res = await authFetch(url, { method: "GET" });
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (res.status === 403) {
        setNoAccess(true);
        setEvents([]);
        return;
      }
      if (!res.ok) {
        const msg = (json && typeof json === "object" && (json.message || json.error)) || text || res.statusText;
        throw new Error(String(msg));
      }
      const data = json as GetProjectCalendarEventsResponse;
      setEvents(Array.isArray((data as any)?.events) ? (data as any).events : []);
    } catch (e) {
      setError(String(e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, projectId, q, mineOnly, currentUserId, assigneeId, status, priority, includeDone, sort]);

  const refetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refetchSummary();
      await refetchEvents();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [refetchSummary, refetchEvents]);

  useEffect(() => {
    void refetchAll();
  }, [refetchAll]);

  const filtered = useMemo(() => {
    let list = events.slice();
    if (onlyOverdue) list = list.filter((e) => Boolean(e.overdue));
    if (onlyDueSoon) list = list.filter((e) => Boolean(e.dueSoon));

    // Stable fallback sorting (client-side) to keep UI predictable
    list.sort((a, b) => {
      const sa = STATUS_ORDER.indexOf(norm(a.status) as any);
      const sb = STATUS_ORDER.indexOf(norm(b.status) as any);
      if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
      const pa = PRIORITY_ORDER.indexOf(norm(a.priority) as any);
      const pb = PRIORITY_ORDER.indexOf(norm(b.priority) as any);
      if (pa !== pb) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
    });
    return list;
  }, [events, onlyOverdue, onlyDueSoon]);

  const activeTasks = filtered.filter((t) => norm(t.status) !== "DONE" && norm(t.status) !== "COMPLETED" && norm(t.status) !== "FINISHED");
  const doneTasks = filtered.filter((t) => norm(t.status) === "DONE" || norm(t.status) === "COMPLETED" || norm(t.status) === "FINISHED");

  const openCreate = () => {
    setModalMode("create");
    setModalInitial(null);
    setRestrictedEdit(false);
    setModalOpen(true);
  };

  const openEdit = (ev: ProjectCalendarEvent) => {
    setModalMode("edit");
    setModalInitial(ev);
    const isOwner = Boolean(currentUserId && projectOwnerId && currentUserId === projectOwnerId);
    const isAuthor = Boolean(currentUserId && ev.createdById && currentUserId === ev.createdById);
    const isAssignee = Boolean(currentUserId && (ev.assignees ?? []).some((a) => a.userId === currentUserId));
    setRestrictedEdit(!isOwner && !isAuthor && isAssignee);
    setModalOpen(true);
  };

  const remove = async (ev: ProjectCalendarEvent) => {
    const ok = window.confirm(`"${ev.title}" 작업을 삭제할까요?`);
    if (!ok) return;
    try {
      const res = await authFetch(
        `/api/projects/${encodeURIComponent(projectId)}/calendar-events/${encodeURIComponent(ev.id)}`,
        { method: "DELETE" },
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);
      await refetchAll();
    } catch (e) {
      alert(`삭제 실패: ${String(e)}`);
    }
  };

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-gray-900">작업 단계 · 진척 관리</h3>
        <p className="mt-1 text-xs text-gray-500">프로젝트 완성을 위해 필요한 작업을 등록하고, 담당자/진행률/상태를 공유합니다.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void refetchAll()}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          새로고침
        </button>
        <button
          onClick={openCreate}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          새 작업 추가
        </button>
      </div>
    </div>
  );

  if (noAccess) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {header}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          이 프로젝트의 작업 일정에 접근할 수 없습니다. 프로젝트 멤버만 작업 일정을 확인할 수 있습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {header}

      {summary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryCard label="전체 작업" value={summary.totalTasks} tone="gray" />
          <SummaryCard label="진행 중" value={summary.inProgressTasks} tone="indigo" />
          <SummaryCard label="완료" value={summary.doneTasks} tone="emerald" />
          <SummaryCard label="평균 진행률" value={`${summary.averageProgress}%`} tone="gray" />
          <SummaryCard label="지연" value={summary.overdueTasks} tone="rose" />
          <SummaryCard label="마감 임박" value={summary.dueSoonTasks} tone="amber" />
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="text-[11px] font-semibold text-gray-500">검색</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목/설명/메모 검색"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div className="lg:col-span-3">
            <div className="text-[11px] font-semibold text-gray-500">담당자</div>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="">전체</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {pickAssigneeLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] font-semibold text-gray-500">상태</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="">전체</option>
              <option value="TODO">시작 전</option>
              <option value="IN_PROGRESS">진행 중</option>
              <option value="REVIEW">검토 중</option>
              <option value="BLOCKED">막힘</option>
              <option value="DONE">완료</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] font-semibold text-gray-500">우선순위</div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="">전체</option>
              <option value="LOW">낮음</option>
              <option value="MEDIUM">보통</option>
              <option value="HIGH">높음</option>
              <option value="URGENT">긴급</option>
            </select>
          </div>

          <div className="lg:col-span-1">
            <div className="text-[11px] font-semibold text-gray-500">정렬</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="DEFAULT">기본</option>
              <option value="DUE_ASC">마감 빠른 순</option>
              <option value="CREATED_DESC">최근 생성</option>
              <option value="PRIORITY_DESC">우선순위</option>
              <option value="PROGRESS_ASC">진행률 낮은 순</option>
              <option value="STATUS">상태 순</option>
            </select>
          </div>

          <div className="lg:col-span-12 flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setMineOnly((v) => !v)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                mineOnly ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              내 작업
            </button>
            <button
              onClick={() => setIncludeDone((v) => !v)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                includeDone ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              완료 포함
            </button>
            <button
              onClick={() => setOnlyDueSoon((v) => !v)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                onlyDueSoon ? "border-amber-300 bg-amber-50 text-amber-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              마감 임박만
            </button>
            <button
              onClick={() => setOnlyOverdue((v) => !v)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                onlyOverdue ? "border-rose-300 bg-rose-50 text-rose-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              지연만
            </button>
            <button
              onClick={() => {
                setQ("");
                setAssigneeId("");
                setMineOnly(false);
                setStatus("");
                setPriority("");
                setIncludeDone(false);
                setOnlyOverdue(false);
                setOnlyDueSoon(false);
                setSort("DEFAULT");
              }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              필터 초기화
            </button>
            <button
              onClick={() => void refetchEvents()}
              className="ml-auto rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              적용
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">멤버 현황</h4>
              <Badge tone="gray">{members.length}</Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {members.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => {
                    setMemberModalTarget(m);
                    setMemberModalOpen(true);
                  }}
                  className="rounded-2xl border border-gray-100 bg-white p-3 text-left hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{pickAssigneeLabel(m)}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        {m.position ? <Badge tone="indigo">{m.position}</Badge> : null}
                        {m.roleInProject ? <Badge tone="gray">{m.roleInProject}</Badge> : null}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <div>
                        담당 <span className="font-semibold text-gray-900">{m.assignedTasks}</span>
                      </div>
                      <div>
                        완료 <span className="font-semibold text-gray-900">{m.doneTasks}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-600">
                    <span>평균</span>
                    <span className="font-semibold text-gray-800">{m.averageProgress}%</span>
                  </div>
                  <div className="mt-1">
                    <ProgressBar value={m.averageProgress} />
                  </div>
                </button>
              ))}
              {members.length === 0 ? <div className="text-sm text-gray-500">멤버 정보를 불러오는 중...</div> : null}
            </div>
          </div>
        </aside>

        <main className="lg:col-span-9">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 whitespace-pre-wrap">
              {error}
              <div className="mt-3">
                <button
                  onClick={() => void refetchAll()}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  재시도
                </button>
              </div>
            </div>
          ) : activeTasks.length === 0 && doneTasks.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div className="grid gap-6">
              <section>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">작업 목록</h4>
                  <Badge tone="gray">{activeTasks.length}</Badge>
                </div>
                <div className="mt-3 grid gap-3">
                  {activeTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      currentUserId={currentUserId}
                      projectOwnerId={projectOwnerId}
                      onEdit={() => openEdit(t)}
                      onDelete={() => void remove(t)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">완료된 작업</h4>
                  <Badge tone="emerald">{doneTasks.length}</Badge>
                </div>
                {includeDone ? (
                  <div className="mt-3 grid gap-3">
                    {doneTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        currentUserId={currentUserId}
                        projectOwnerId={projectOwnerId}
                        onEdit={() => openEdit(t)}
                        onDelete={() => void remove(t)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-gray-500">완료된 작업은 상단의 “완료 포함”을 켜면 볼 수 있어요.</div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      <MemberProgressModal
        open={memberModalOpen}
        member={memberModalTarget}
        onClose={() => setMemberModalOpen(false)}
      />

      <EventFormModal
        open={modalOpen}
        mode={modalMode}
        initial={modalInitial}
        members={members}
        currentUserId={currentUserId}
        restrictedToAssigneeFields={restrictedEdit}
        submitting={saving}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            if (modalMode === "create") {
              const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}/calendar-events`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload as CreateProjectCalendarEventRequest),
              });
              const text = await res.text();
              let json: any = null;
              try {
                json = text ? JSON.parse(text) : null;
              } catch {
                json = null;
              }
              if (!res.ok) {
                const msg =
                  (json && typeof json === "object" && (json.message || json.error)) ||
                  text ||
                  res.statusText;
                throw new Error(String(msg));
              }
            } else if (modalInitial) {
              const res = await authFetch(
                `/api/projects/${encodeURIComponent(projectId)}/calendar-events/${encodeURIComponent(modalInitial.id)}`,
                {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(payload as UpdateProjectCalendarEventRequest),
                },
              );
              const text = await res.text();
              let json: any = null;
              try {
                json = text ? JSON.parse(text) : null;
              } catch {
                json = null;
              }
              if (!res.ok) {
                const msg =
                  (json && typeof json === "object" && (json.message || json.error)) ||
                  text ||
                  res.statusText;
                throw new Error(String(msg));
              }
            }
            setModalOpen(false);
            await refetchAll();
          } catch (e) {
            const raw = e instanceof Error ? e.message : String(e);
            const hint =
              raw.includes("Prisma migration") || raw.includes("DB 스키마")
                ? "\n\n힌트: 백엔드 컨테이너에서 `npx prisma migrate deploy`를 실행한 뒤 다시 시도해 보세요."
                : "";
            alert(`저장 실패: ${raw}${hint}`);
          } finally {
            setSaving(false);
          }
        }}
      />
    </section>
  );
}
