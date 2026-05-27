"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_OPEN_AI_BUNDLE_MODEL,
  OPEN_AI_BUNDLE_MODEL_OPTIONS,
  type OpenAiBundleModelId,
} from "@/lib/openai-bundle-models";
import type { CreateProjectCalendarEventRequest } from "@/lib/types/schedule";

type AiScheduleDraftMeta = {
  provider?: string;
  openAiModel?: string | null;
  projectId?: string;
  windowStart?: string;
  windowEnd?: string;
  count?: number;
};

type AiScheduleDraftResponse = {
  meta?: AiScheduleDraftMeta;
  events?: CreateProjectCalendarEventRequest[];
};

function formatDt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function AiScheduleDraftModal(props: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onApplied: () => Promise<void> | void;
}) {
  const { open, projectId, onClose, authFetch, onApplied } = props;

  const [notes, setNotes] = useState("");
  const [openAiModel, setOpenAiModel] = useState<OpenAiBundleModelId>(
    DEFAULT_OPEN_AI_BUNDLE_MODEL,
  );
  const [maxEvents, setMaxEvents] = useState(15);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<AiScheduleDraftMeta | null>(null);
  const [drafts, setDrafts] = useState<CreateProjectCalendarEventRequest[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const selectedCount = useMemo(
    () => drafts.filter((_, i) => selected[i]).length,
    [drafts, selected],
  );

  const selectAll = useCallback(() => {
    const next: Record<number, boolean> = {};
    drafts.forEach((_, i) => {
      next[i] = true;
    });
    setSelected(next);
  }, [drafts]);

  const selectNone = useCallback(() => setSelected({}), []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setMeta(null);
    try {
      const body: Record<string, unknown> = {
        maxEvents: Math.min(30, Math.max(5, maxEvents)),
        openAiModel,
      };
      if (notes.trim()) body.additionalNotes = notes.trim();

      const res = await authFetch(`/api/ai/projects/${encodeURIComponent(projectId)}/schedule-draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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
          json && typeof json === "object" && (json.message || json.error)
            ? JSON.stringify(json.message ?? json.error)
            : text || res.statusText;
        throw new Error(String(msg));
      }

      const data = json as AiScheduleDraftResponse;
      const events = Array.isArray(data?.events) ? data.events : [];
      setDrafts(events);
      setMeta(data.meta ?? null);
      const initSel: Record<number, boolean> = {};
      events.forEach((_, i) => {
        initSel[i] = true;
      });
      setSelected(initSel);
    } catch (e) {
      setDrafts([]);
      setSelected({});
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    const events = drafts.filter((_, i) => selected[i]);
    if (events.length === 0) {
      alert("적용할 항목을 최소 하나 선택해 주세요.");
      return;
    }

    const ok = window.confirm(
      `${events.length}개 일정을 프로젝트에 등록합니다. 표시 순서와 기존 순서 규칙을 따른 신규 항목이 추가됩니다. 계속할까요?`,
    );
    if (!ok) return;

    setApplyLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/projects/${encodeURIComponent(projectId)}/calendar-events/bulk`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ events }),
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
          json && typeof json === "object" && (json.message || json.error)
            ? JSON.stringify(json.message ?? json.error)
            : text || res.statusText;
        throw new Error(String(msg));
      }
      await onApplied();
      onClose();
      setDrafts([]);
      setSelected({});
      setMeta(null);
      setNotes("");
    } catch (e) {
      setError(`등록 실패: ${String(e)}`);
    } finally {
      setApplyLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <div className="text-base font-extrabold text-gray-900">AI 일정 초안</div>
            <div className="mt-1 text-xs text-gray-500">
              프로젝트 정보와 AI 산출물을 참고해 일정 초안을 만듭니다. 적용하기 전에 항목을 확인·선택하세요.
            </div>
            {meta?.windowStart && meta.windowEnd ? (
              <div className="mt-2 text-[11px] text-gray-500">
                참고 구간: {formatDt(meta.windowStart)} ~ {formatDt(meta.windowEnd)}{" "}
                {meta.provider ? `· ${meta.provider}` : ""}{" "}
                {meta.openAiModel ? `· ${meta.openAiModel}` : ""}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-xl border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={() => (!loading && !applyLoading ? onClose() : null)}
            disabled={loading || applyLoading}
          >
            닫기
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold text-gray-500">추가 메모 (선택)</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="예: 테스트 기간은 2주로 잡아 주세요 · 프론트 우선 ..."
                disabled={loading || applyLoading}
                className="mt-1 min-h-[76px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              />
            </div>
            <fieldset className="sm:col-span-2 text-sm">
              <legend className="text-[11px] font-semibold text-gray-500">AI 모델</legend>
              <p className="mt-1 text-[11px] text-gray-500">
                프로젝트 초안 생성과 동일하게 OpenAI 모델을 골라요. (실제 호출은{" "}
                <code className="rounded bg-gray-100 px-1">AI_PROVIDER=openai</code> 일 때만 적용됩니다.)
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {OPEN_AI_BUNDLE_MODEL_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                      openAiModel === opt.id
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="schedule-draft-openAiModel"
                      value={opt.id}
                      checked={openAiModel === opt.id}
                      onChange={() => setOpenAiModel(opt.id)}
                      disabled={loading || applyLoading}
                      className="mt-1 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-gray-900">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{opt.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="text-[11px] font-semibold text-gray-500">이벤트 개수 (5~30)</div>
              <input
                type="number"
                min={5}
                max={30}
                value={maxEvents}
                onChange={(e) => setMaxEvents(Number(e.target.value || 15))}
                disabled={loading || applyLoading}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => void generate()}
                disabled={loading || applyLoading}
                className="w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? "생성 중…" : "초안 생성"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={!drafts.length || loading || applyLoading}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={selectNone}
              disabled={!drafts.length || loading || applyLoading}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              전체 해제
            </button>
            <div className="ml-auto text-xs font-semibold text-gray-600">
              선택됨 <span className="text-gray-900">{selectedCount}</span> /{" "}
              <span className="text-gray-900">{drafts.length}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
            {drafts.length === 0 ? (
              <div className="rounded-xl px-4 py-6 text-center text-sm text-gray-500">
                아직 초안이 없습니다. 위에서 “초안 생성”을 눌러 주세요.
              </div>
            ) : (
              <ul className="space-y-2">
                {drafts.map((ev, idx) => (
                  <li
                    key={`${idx}-${ev.title}-${ev.startAt}`}
                    className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(selected[idx])}
                        disabled={loading || applyLoading}
                        onChange={(e) => setSelected((s) => ({ ...s, [idx]: e.target.checked }))}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-gray-900">{ev.title}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-gray-500">
                          {(ev.type ?? "TASK").toUpperCase()}
                          {ev.priority ? ` · ${ev.priority}` : ""}
                          {ev.isAllDay ? " · 종일" : ""}
                        </div>
                        {ev.description ? (
                          <div className="mt-1 text-xs text-gray-600">{ev.description}</div>
                        ) : null}
                        <div className="mt-2 text-xs text-gray-600">
                          {formatDt(String(ev.startAt))} → {formatDt(String(ev.endAt))}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pb-2">
            <button
              type="button"
              onClick={() => void apply()}
              disabled={!drafts.length || loading || applyLoading || selectedCount === 0}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              {applyLoading ? "등록 중…" : `선택 항목 등록 (${selectedCount})`}
            </button>
            <button
              type="button"
              onClick={() => (!loading && !applyLoading ? onClose() : null)}
              disabled={loading || applyLoading}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
