"use client";

import type { CalendarEventsSummaryMember } from "@/lib/types/schedule";

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className="h-2 rounded-full bg-gray-900" style={{ width: `${v}%` }} />
    </div>
  );
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

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function norm(v: string | null | undefined) {
  return String(v ?? "").trim().toUpperCase();
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

export default function MemberProgressModal({
  open,
  member,
  onClose,
}: {
  open: boolean;
  member: CalendarEventsSummaryMember | null;
  onClose: () => void;
}) {
  if (!open || !member) return null;

  const overdue = member.currentTasks.filter((t) => t.overdue);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className="h-full w-full max-w-xl overflow-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-gray-900">{member.nickname ?? member.email ?? member.userId}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                {member.email ? <span className="truncate">{member.email}</span> : null}
                {member.position ? <Badge tone="indigo">{member.position}</Badge> : null}
                {member.roleInProject ? <Badge tone="gray">{member.roleInProject}</Badge> : null}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              닫기
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold text-gray-500">담당</div>
              <div className="mt-1 text-lg font-bold text-gray-900">{member.assignedTasks}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold text-gray-500">완료</div>
              <div className="mt-1 text-lg font-bold text-gray-900">{member.doneTasks}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold text-gray-500">진행중</div>
              <div className="mt-1 text-lg font-bold text-gray-900">{member.inProgressTasks}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-semibold text-gray-500">평균</div>
              <div className="mt-1 text-lg font-bold text-gray-900">{member.averageProgress}%</div>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={member.averageProgress} />
          </div>
        </div>

        <div className="grid gap-6 px-6 py-5">
          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">현재 작업</h4>
              <Badge tone="gray">{member.currentTasks.length}</Badge>
            </div>
            {member.currentTasks.length === 0 ? (
              <div className="mt-3 text-sm text-gray-500">현재 진행 중인 작업이 없습니다.</div>
            ) : (
              <div className="mt-3 grid gap-2">
                {member.currentTasks.slice(0, 20).map((t) => (
                  <div key={t.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{t.title}</div>
                        {t.description ? (
                          <div className="mt-1 line-clamp-2 text-xs text-gray-600">{t.description}</div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <Badge tone="indigo">{labelStatus(t.status)}</Badge>
                          <Badge tone="gray">{labelPriority(t.priority)}</Badge>
                          {t.dueSoon ? <Badge tone="amber">마감 임박</Badge> : null}
                          {t.overdue ? <Badge tone="rose">지연</Badge> : null}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <div>
                          마감 <span className="font-semibold text-gray-800">{formatDate(t.endAt)}</span>
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">{Math.round(Number(t.progress ?? 0))}%</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={Number(t.progress ?? 0)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">완료한 작업</h4>
              <Badge tone="emerald">{member.doneTaskList.length}</Badge>
            </div>
            {member.doneTaskList.length === 0 ? (
              <div className="mt-3 text-sm text-gray-500">완료한 작업이 없습니다.</div>
            ) : (
              <div className="mt-3 grid gap-2">
                {member.doneTaskList.slice(0, 20).map((t) => (
                  <div key={t.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="truncate text-sm font-semibold text-gray-900">{t.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <Badge tone="emerald">완료</Badge>
                      <Badge tone="gray">{labelPriority(t.priority)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">지연된 작업</h4>
              <Badge tone="rose">{overdue.length}</Badge>
            </div>
            {overdue.length === 0 ? (
              <div className="mt-3 text-sm text-gray-500">지연된 작업이 없습니다.</div>
            ) : (
              <div className="mt-3 grid gap-2">
                {overdue.slice(0, 20).map((t) => (
                  <div key={t.id} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <div className="truncate text-sm font-semibold text-gray-900">{t.title}</div>
                    <div className="mt-1 text-xs text-rose-700">
                      마감 <span className="font-semibold">{formatDate(t.endAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
