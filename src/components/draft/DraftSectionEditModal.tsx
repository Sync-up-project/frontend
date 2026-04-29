"use client";

import { useEffect, useState } from "react";
import type { DraftModalKey } from "./draft-content-types";

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function clone<T>(v: T): T {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v)) as T;
  }
}

const PLATFORMS = [
  "web",
  "mobile_web",
  "ios",
  "android",
  "desktop",
] as const;

const COMPLEXITY = [
  "auth",
  "rbac",
  "payment",
  "realtime",
  "file_upload",
  "search",
  "recommendation",
  "external_api",
  "notifications",
  "admin_console",
  "analytics",
  "multilingual",
] as const;

const PRIORITY = ["must", "should", "could", "wont"] as const;

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const QUESTION_TYPES = [
  "single_choice",
  "multi_choice",
  "free_text",
  "boolean",
] as const;

type Props = {
  modalKey: DraftModalKey;
  title: string;
  initial: unknown;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: unknown) => Promise<boolean>;
};

export function DraftSectionEditModal({
  modalKey,
  title,
  initial,
  saving,
  error,
  onClose,
  onSave,
}: Props) {
  const [useJson, setUseJson] = useState(false);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(initial ?? {}, null, 2),
  );
  const [jsonErr, setJsonErr] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(initial ?? {}, null, 2));
    setJsonErr(null);
    setUseJson(false);
  }, [modalKey, initial]);

  async function handleJsonSave() {
    setJsonErr(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonErr("JSON 형식이 올바르지 않아요.");
      return;
    }
    const ok = await onSave(parsed);
    if (!ok) return;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-950"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
            {title}
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={useJson}
              onChange={(e) => setUseJson(e.target.checked)}
              className="rounded border-gray-300"
            />
            고급: JSON으로 편집
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {useJson ? (
            <>
              <p className="mb-2 text-xs text-amber-800 dark:text-amber-200/90">
                잘못된 JSON은 저장 시 서버에서 거절될 수 있어요.
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonErr(null);
                }}
                spellCheck={false}
                rows={22}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              />
              {jsonErr && (
                <p className="mt-2 text-xs text-red-600">{jsonErr}</p>
              )}
            </>
          ) : modalKey === "ideaNormalized" ? (
            <IdeaForm initial={initial} onSave={onSave} saving={saving} />
          ) : modalKey === "screens" ? (
            <ScreensForm initial={initial} onSave={onSave} saving={saving} />
          ) : modalKey === "apiSpec" ? (
            <ApiSpecForm initial={initial} onSave={onSave} saving={saving} />
          ) : modalKey === "erd" ? (
            <ErdForm initial={initial} onSave={onSave} saving={saving} />
          ) : modalKey === "questions" ? (
            <QuestionsForm initial={initial} onSave={onSave} saving={saving} />
          ) : null}
        </div>

        {error && (
          <pre className="max-h-24 overflow-auto whitespace-pre-wrap border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </pre>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-neutral-800">
          <button
            type="button"
            disabled={saving}
            onClick={() => !saving && onClose()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            취소
          </button>
          {useJson ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleJsonSave()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function IdeaForm({
  initial,
  onSave,
  saving,
}: {
  initial: unknown;
  onSave: (v: unknown) => Promise<boolean>;
  saving: boolean;
}) {
  const base = (initial && typeof initial === "object" ? initial : {}) as any;
  const pm = base.project_meta ?? {};
  const ps = base.problem_solution ?? {};
  const c = base.constraints ?? {};

  const [title, setTitle] = useState(String(pm.title ?? ""));
  const [oneLiner, setOneLiner] = useState(String(pm.one_liner ?? ""));
  const [domain, setDomain] = useState(String(pm.domain ?? "general"));
  const [primaryLanguage, setPrimaryLanguage] = useState<
    "ko" | "en" | "ja"
  >(pm.primary_language === "en" || pm.primary_language === "ja" ? pm.primary_language : "ko");
  const [platforms, setPlatforms] = useState<string[]>(
    safeArr<string>(pm.target_platforms).length
      ? safeArr<string>(pm.target_platforms)
      : ["web"],
  );
  const [problem, setProblem] = useState(String(ps.problem_statement ?? ""));
  const [solution, setSolution] = useState(String(ps.solution_summary ?? ""));
  const [uniqueLines, setUniqueLines] = useState(
    safeArr<string>(ps.unique_value).join("\n"),
  );
  const [features, setFeatures] = useState<
    { name: string; description: string; priority: string; triggers: string[] }[]
  >(
    safeArr<any>(base.features).map((f) => ({
      name: String(f?.name ?? ""),
      description: String(f?.description ?? ""),
      priority: PRIORITY.includes(f?.priority) ? f.priority : "should",
      triggers: safeArr<string>(f?.complexity_triggers),
    })),
  );
  const [roles, setRoles] = useState<
    { role: string; description: string; perms: string }[]
  >(
    safeArr<any>(base.users_and_roles).map((r) => ({
      role: String(r?.role ?? ""),
      description: String(r?.description ?? ""),
      perms: safeArr<string>(r?.key_permissions).join(", "),
    })),
  );
  const [recruitIso, setRecruitIso] = useState(
    String(c.recruit_deadline_iso ?? "").slice(0, 10),
  );
  const [endIso, setEndIso] = useState(
    String(c.project_end_iso ?? c.deadline ?? "").slice(0, 10),
  );
  const [capacity, setCapacity] = useState(
    String(c.suggested_recruit_capacity ?? 4),
  );

  useEffect(() => {
    const b = (initial && typeof initial === "object" ? initial : {}) as any;
    const p = b.project_meta ?? {};
    const pr = b.problem_solution ?? {};
    const co = b.constraints ?? {};
    setTitle(String(p.title ?? ""));
    setOneLiner(String(p.one_liner ?? ""));
    setDomain(String(p.domain ?? "general"));
    setPrimaryLanguage(
      p.primary_language === "en" || p.primary_language === "ja"
        ? p.primary_language
        : "ko",
    );
    setPlatforms(
      safeArr<string>(p.target_platforms).length
        ? safeArr<string>(p.target_platforms)
        : ["web"],
    );
    setProblem(String(pr.problem_statement ?? ""));
    setSolution(String(pr.solution_summary ?? ""));
    setUniqueLines(safeArr<string>(pr.unique_value).join("\n"));
    setFeatures(
      safeArr<any>(b.features).map((f) => ({
        name: String(f?.name ?? ""),
        description: String(f?.description ?? ""),
        priority: PRIORITY.includes(f?.priority) ? f.priority : "should",
        triggers: safeArr<string>(f?.complexity_triggers),
      })),
    );
    setRoles(
      safeArr<any>(b.users_and_roles).map((r) => ({
        role: String(r?.role ?? ""),
        description: String(r?.description ?? ""),
        perms: safeArr<string>(r?.key_permissions).join(", "),
      })),
    );
    setRecruitIso(String(co.recruit_deadline_iso ?? "").slice(0, 10));
    setEndIso(String(co.project_end_iso ?? co.deadline ?? "").slice(0, 10));
    setCapacity(String(co.suggested_recruit_capacity ?? 4));
  }, [initial]);

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function toggleTrigger(fi: number, t: string) {
    setFeatures((prev) =>
      prev.map((row, i) => {
        if (i !== fi) return row;
        const has = row.triggers.includes(t);
        return {
          ...row,
          triggers: has
            ? row.triggers.filter((x) => x !== t)
            : [...row.triggers, t],
        };
      }),
    );
  }

  async function submit() {
    const prev = clone(base);
    const unique_value = uniqueLines
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const cap = Math.min(40, Math.max(2, Math.floor(Number(capacity)) || 4));
    const next = {
      ...prev,
      project_meta: {
        ...(prev.project_meta ?? {}),
        title: title.trim() || prev.project_meta?.title || "제목 없음",
        one_liner: oneLiner.trim(),
        domain: domain.trim() || "general",
        target_platforms: platforms.length ? platforms : ["web"],
        primary_language: primaryLanguage,
        reference_links: safeArr(prev.project_meta?.reference_links),
      },
      problem_solution: {
        problem_statement: problem.trim(),
        solution_summary: solution.trim(),
        unique_value,
      },
      features: features.map((f, idx) => {
        const orig = (safeArr(prev.features)[idx] ?? {}) as any;
        return {
          ...orig,
          name: f.name.trim() || `기능 ${idx + 1}`,
          description: f.description.trim() || "-",
          priority: PRIORITY.includes(f.priority as any)
            ? f.priority
            : "should",
          complexity_triggers: f.triggers,
          acceptance_criteria: safeArr(orig.acceptance_criteria),
        };
      }),
      users_and_roles: roles.map((r, idx) => {
        const orig = (safeArr(prev.users_and_roles)[idx] ?? {}) as any;
        return {
          ...orig,
          role: r.role.trim() || `role_${idx}`,
          description: r.description.trim() || "-",
          key_permissions: r.perms
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };
      }),
      constraints: {
        ...(prev.constraints ?? {}),
        recruit_deadline_iso: recruitIso.trim() || null,
        project_end_iso: endIso.trim() || null,
        deadline: endIso.trim() || null,
        suggested_recruit_capacity: cap,
      },
    };
    const ok = await onSave(next);
    if (!ok) return;
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className="grid gap-5 text-sm text-gray-900 dark:text-neutral-100">
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-neutral-200">
          프로젝트 개요
        </h3>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">제목</span>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">한 줄 소개</span>
          <input
            className={inputCls}
            value={oneLiner}
            onChange={(e) => setOneLiner(e.target.value)}
          />
        </label>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">도메인</span>
          <input className={inputCls} value={domain} onChange={(e) => setDomain(e.target.value)} />
        </label>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">기본 언어</span>
          <select
            className={inputCls}
            value={primaryLanguage}
            onChange={(e) =>
              setPrimaryLanguage(e.target.value as "ko" | "en" | "ja")
            }
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </label>
        <div className="mt-2">
          <span className="text-xs text-gray-500">타깃 플랫폼</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                  platforms.includes(p)
                    ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-gray-200 bg-white text-gray-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 dark:text-neutral-200">
          문제 / 해결
        </h3>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">문제 정의</span>
          <textarea
            className={inputCls + " min-h-[72px]"}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
          />
        </label>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">해결 요약</span>
          <textarea
            className={inputCls + " min-h-[72px]"}
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
          />
        </label>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">차별점 (줄바꿈으로 여러 개)</span>
          <textarea
            className={inputCls + " min-h-[56px]"}
            value={uniqueLines}
            onChange={(e) => setUniqueLines(e.target.value)}
          />
        </label>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 dark:text-neutral-200">
          일정·모집 (제안값)
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-gray-500">모집 마감 (YYYY-MM-DD)</span>
            <input
              type="date"
              className={inputCls}
              value={recruitIso}
              onChange={(e) => setRecruitIso(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-500">프로젝트 종료 (YYYY-MM-DD)</span>
            <input
              type="date"
              className={inputCls}
              value={endIso}
              onChange={(e) => setEndIso(e.target.value)}
            />
          </label>
        </div>
        <label className="mt-2 grid gap-1">
          <span className="text-xs text-gray-500">제안 모집 인원 (2~40)</span>
          <input
            type="number"
            min={2}
            max={40}
            className={inputCls}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-neutral-200">핵심 기능</h3>
          <button
            type="button"
            onClick={() =>
              setFeatures((f) => [
                ...f,
                { name: "", description: "", priority: "should", triggers: [] },
              ])
            }
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            + 행 추가
          </button>
        </div>
        <div className="mt-2 grid gap-3">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800"
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setFeatures((rows) => rows.filter((_, i) => i !== idx))}
                  className="text-xs text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
              <input
                className={inputCls}
                placeholder="기능 이름"
                value={f.name}
                onChange={(e) =>
                  setFeatures((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                  )
                }
              />
              <textarea
                className={inputCls + " mt-2 min-h-[56px]"}
                placeholder="설명"
                value={f.description}
                onChange={(e) =>
                  setFeatures((rows) =>
                    rows.map((r, i) =>
                      i === idx ? { ...r, description: e.target.value } : r,
                    ),
                  )
                }
              />
              <label className="mt-2 grid gap-1">
                <span className="text-xs text-gray-500">우선순위</span>
                <select
                  className={inputCls}
                  value={f.priority}
                  onChange={(e) =>
                    setFeatures((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, priority: e.target.value } : r,
                      ),
                    )
                  }
                >
                  {PRIORITY.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2">
                <span className="text-xs text-gray-500">복잡도 태그</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {COMPLEXITY.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTrigger(idx, t)}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        f.triggers.includes(t)
                          ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                          : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-neutral-200">역할</h3>
          <button
            type="button"
            onClick={() =>
              setRoles((r) => [...r, { role: "", description: "", perms: "" }])
            }
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            + 행 추가
          </button>
        </div>
        <div className="mt-2 grid gap-3">
          {roles.map((r, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800"
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setRoles((rows) => rows.filter((_, i) => i !== idx))}
                  className="text-xs text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
              <input
                className={inputCls}
                placeholder="역할 이름"
                value={r.role}
                onChange={(e) =>
                  setRoles((rows) =>
                    rows.map((row, i) =>
                      i === idx ? { ...row, role: e.target.value } : row,
                    ),
                  )
                }
              />
              <textarea
                className={inputCls + " mt-2 min-h-[48px]"}
                placeholder="설명"
                value={r.description}
                onChange={(e) =>
                  setRoles((rows) =>
                    rows.map((row, i) =>
                      i === idx ? { ...row, description: e.target.value } : row,
                    ),
                  )
                }
              />
              <input
                className={inputCls + " mt-2"}
                placeholder="권한 (쉼표로 구분)"
                value={r.perms}
                onChange={(e) =>
                  setRoles((rows) =>
                    rows.map((row, i) =>
                      i === idx ? { ...row, perms: e.target.value } : row,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end border-t border-gray-100 pt-3 dark:border-neutral-800">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function ScreensForm({
  initial,
  onSave,
  saving,
}: {
  initial: unknown;
  onSave: (v: unknown) => Promise<boolean>;
  saving: boolean;
}) {
  const b = (initial && typeof initial === "object" ? initial : {}) as any;
  const [rows, setRows] = useState<
    { id: string; name: string; route: string; goal: string }[]
  >([]);

  useEffect(() => {
    const scr = safeArr<any>(b.screens).map((s) => ({
      id: String(s?.id ?? `scr_${Math.random().toString(36).slice(2, 9)}`),
      name: String(s?.name ?? ""),
      route: String(s?.route ?? ""),
      goal: String(s?.goal ?? ""),
    }));
    setRows(scr.length ? scr : [{ id: "main", name: "", route: "/", goal: "" }]);
  }, [initial]);

  async function submit() {
    const prev = clone(b);
    const effectiveRows =
      rows.length > 0
        ? rows
        : [{ id: "main", name: "", route: "/", goal: "" }];
    const screens = effectiveRows.map((row, idx) => {
      const orig = (safeArr(prev.screens)[idx] ?? {}) as any;
      return {
        ...orig,
        id: row.id.trim() || `screen_${idx}`,
        name: row.name.trim() || `화면 ${idx + 1}`,
        route: row.route.trim() || "/",
        goal: row.goal.trim() || "-",
        actor_roles: safeArr(orig.actor_roles).length ? orig.actor_roles : ["member"],
        main_components: safeArr(orig.main_components),
        states: orig.states?.length ? orig.states : ["loading", "success"],
        required_apis: safeArr(orig.required_apis),
        permissions: orig.permissions ?? {
          auth_required: "yes",
          roles_allowed: ["member"],
        },
        notes: safeArr(orig.notes),
      };
    });
    const ok = await onSave({
      ...prev,
      schema_version: prev.schema_version ?? "1.0",
      screens,
      navigation: safeArr(prev.navigation),
      assumptions: safeArr(prev.assumptions),
      open_questions: safeArr(prev.open_questions),
    });
    if (!ok) return;
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className="grid gap-3">
      <div className="flex justify-between">
        <p className="text-xs text-gray-500">화면 단위로 id·이름·경로·목표를 수정해요.</p>
        <button
          type="button"
          onClick={() =>
            setRows((r) => [
              ...r,
              { id: `scr_${Date.now()}`, name: "", route: "", goal: "" },
            ])
          }
          className="text-xs font-semibold text-indigo-600"
        >
          + 추가
        </button>
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.id + idx}
          className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
              className="text-xs text-red-600"
            >
              삭제
            </button>
          </div>
          <label className="grid gap-1 text-xs">
            id
            <input
              className={inputCls}
              value={row.id}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)),
                )
              }
            />
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            이름
            <input
              className={inputCls}
              value={row.name}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                )
              }
            />
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            라우트
            <input
              className={inputCls}
              value={row.route}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, route: e.target.value } : x)),
                )
              }
            />
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            목표
            <textarea
              className={inputCls + " min-h-[48px]"}
              value={row.goal}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, goal: e.target.value } : x)),
                )
              }
            />
          </label>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function emptyEndpoint(id: string) {
  return {
    id,
    name: "",
    method: "GET" as const,
    path: "",
    summary: "",
    auth_required: "no" as const,
    roles_allowed: [] as string[],
    rate_limit_hint: null,
    request: {
      headers: [],
      query: [],
      params: [],
      body: {
        content_type: "application/json" as const,
        schema: "object",
        example: {},
      },
    },
    responses: [
      { status: 200, description: "OK", schema: "object", example: {} },
    ],
    errors: [],
    related_screens: [] as string[],
    notes: [] as string[],
  };
}

function ApiSpecForm({
  initial,
  onSave,
  saving,
}: {
  initial: unknown;
  onSave: (v: unknown) => Promise<boolean>;
  saving: boolean;
}) {
  const b = (initial && typeof initial === "object" ? initial : {}) as any;
  const [rows, setRows] = useState<
    { id: string; name: string; method: string; path: string; summary: string; auth: string }[]
  >([]);

  useEffect(() => {
    const ep = safeArr<any>(b.endpoints).map((e) => ({
      id: String(e?.id ?? `ep_${Math.random().toString(36).slice(2, 9)}`),
      name: String(e?.name ?? ""),
      method: HTTP_METHODS.includes(e?.method) ? e.method : "GET",
      path: String(e?.path ?? ""),
      summary: String(e?.summary ?? ""),
      auth: e?.auth_required === "yes" ? "yes" : "no",
    }));
    setRows(
      ep.length
        ? ep
        : [
            {
              id: "ep1",
              name: "",
              method: "GET",
              path: "/items",
              summary: "",
              auth: "no",
            },
          ],
    );
  }, [initial]);

  async function submit() {
    const prev = clone(b);
    const effectiveRows =
      rows.length > 0
        ? rows
        : [
            {
              id: "ep1",
              name: "",
              method: "GET",
              path: "/items",
              summary: "",
              auth: "no",
            },
          ];
    const endpoints = effectiveRows.map((row, idx) => {
      const orig = safeArr(prev.endpoints)[idx] ?? emptyEndpoint(row.id);
      return {
        ...orig,
        id: row.id.trim() || `ep_${idx}`,
        name: row.name.trim() || `API ${idx + 1}`,
        method: HTTP_METHODS.includes(row.method as any) ? row.method : "GET",
        path: row.path.trim() || "/",
        summary: row.summary.trim() || "-",
        auth_required: row.auth === "yes" ? "yes" : "no",
      };
    });
    const ok = await onSave({
      ...prev,
      schema_version: prev.schema_version ?? "1.0",
      base_url_hint: prev.base_url_hint ?? "/api",
      auth: prev.auth ?? { strategy: "unknown", notes: [] },
      endpoints,
      assumptions: safeArr(prev.assumptions),
      open_questions: safeArr(prev.open_questions),
    });
    if (!ok) return;
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className="grid gap-3">
      <div className="flex justify-between">
        <p className="text-xs text-gray-500">엔드포인트별 메서드·경로·요약을 편집해요.</p>
        <button
          type="button"
          onClick={() =>
            setRows((r) => [
              ...r,
              {
                id: `ep_${Date.now()}`,
                name: "",
                method: "GET",
                path: "",
                summary: "",
                auth: "no",
              },
            ])
          }
          className="text-xs font-semibold text-indigo-600"
        >
          + 추가
        </button>
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.id + idx}
          className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
              className="text-xs text-red-600"
            >
              삭제
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              id
              <input
                className={inputCls}
                value={row.id}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)),
                  )
                }
              />
            </label>
            <label className="grid gap-1 text-xs">
              이름
              <input
                className={inputCls}
                value={row.name}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                  )
                }
              />
            </label>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-xs">
              메서드
              <select
                className={inputCls}
                value={row.method}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, i) =>
                      i === idx ? { ...x, method: e.target.value } : x,
                    ),
                  )
                }
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs sm:col-span-2">
              경로
              <input
                className={inputCls}
                value={row.path}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, i) => (i === idx ? { ...x, path: e.target.value } : x)),
                  )
                }
              />
            </label>
          </div>
          <label className="mt-2 grid gap-1 text-xs">
            요약
            <textarea
              className={inputCls + " min-h-[48px]"}
              value={row.summary}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) =>
                    i === idx ? { ...x, summary: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={row.auth === "yes"}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) =>
                    i === idx
                      ? { ...x, auth: e.target.checked ? "yes" : "no" }
                      : x,
                  ),
                )
              }
            />
            인증 필요
          </label>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function ErdForm({
  initial,
  onSave,
  saving,
}: {
  initial: unknown;
  onSave: (v: unknown) => Promise<boolean>;
  saving: boolean;
}) {
  const b = (initial && typeof initial === "object" ? initial : {}) as any;
  const [rows, setRows] = useState<{ name: string; description: string }[]>([]);

  useEffect(() => {
    setRows(
      safeArr<any>(b.entities).map((e) => ({
        name: String(e?.name ?? ""),
        description: String(e?.description ?? ""),
      })),
    );
  }, [initial]);

  async function submit() {
    const prev = clone(b);
    const entityRows =
      rows.length > 0 ? rows : [{ name: "", description: "" }];
    const entities = entityRows.map((row, idx) => {
      const orig = (safeArr(prev.entities)[idx] ?? {}) as any;
      return {
        ...orig,
        name: row.name.trim() || `Entity_${idx + 1}`,
        description: row.description.trim() || "",
        columns: safeArr(orig.columns).length
          ? orig.columns
          : [
              {
                name: "id",
                type: "uuid",
                nullable: "no",
                pk: "yes",
                unique: "no",
                default: null,
                comment: "",
              },
            ],
        indexes: safeArr(orig.indexes),
      };
    });
    const ok = await onSave({
      ...prev,
      schema_version: prev.schema_version ?? "1.0",
      entities,
      relationships: safeArr(prev.relationships),
      common_conventions: prev.common_conventions ?? {
        id_strategy: "cuid",
        timestamps: "createdAt/updatedAt",
        soft_delete: "unknown",
      },
      assumptions: safeArr(prev.assumptions),
      open_questions: safeArr(prev.open_questions),
    });
    if (!ok) return;
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className="grid gap-3">
      <div className="flex justify-between">
        <p className="text-xs text-gray-500">엔티티 이름·설명만 바꿔도 컬럼 구조는 기존 값을 유지해요.</p>
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { name: "", description: "" }])}
          className="text-xs font-semibold text-indigo-600"
        >
          + 추가
        </button>
      </div>
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
              className="text-xs text-red-600"
            >
              삭제
            </button>
          </div>
          <label className="grid gap-1 text-xs">
            엔티티 이름
            <input
              className={inputCls}
              value={row.name}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                )
              }
            />
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            설명
            <textarea
              className={inputCls + " min-h-[48px]"}
              value={row.description}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) =>
                    i === idx ? { ...x, description: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function QuestionsForm({
  initial,
  onSave,
  saving,
}: {
  initial: unknown;
  onSave: (v: unknown) => Promise<boolean>;
  saving: boolean;
}) {
  const b = (initial && typeof initial === "object" ? initial : {}) as any;
  const [rows, setRows] = useState<
    {
      id: string;
      question: string;
      type: string;
      optionsText: string;
      why: string;
    }[]
  >([]);

  useEffect(() => {
    setRows(
      safeArr<any>(b.questions)
        .slice(0, 5)
        .map((q) => ({
        id: String(q?.id ?? `q_${Math.random().toString(36).slice(2, 9)}`),
        question: String(q?.question ?? ""),
        type: QUESTION_TYPES.includes(q?.type) ? q.type : "free_text",
        optionsText: safeArr<string>(q?.options).join("\n"),
        why: String(q?.why_it_matters ?? ""),
      })),
    );
  }, [initial]);

  async function submit() {
    const prev = clone(b);
    const cappedRows = rows.slice(0, 5);
    const questions = cappedRows.map((row, idx) => {
      const orig = (safeArr(prev.questions)[idx] ?? {}) as any;
      const options = row.optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        ...orig,
        id: row.id.trim() || `q_${idx}`,
        question: row.question.trim() || `질문 ${idx + 1}`,
        type: QUESTION_TYPES.includes(row.type as any) ? row.type : "free_text",
        options,
        default: orig.default ?? null,
        why_it_matters: row.why.trim() || "-",
        impacts: safeArr(orig.impacts).length ? orig.impacts : ["screens"],
      };
    });
    const ok = await onSave({
      ...prev,
      schema_version: prev.schema_version ?? "1.0",
      questions,
      limit_policy: prev.limit_policy ?? {
        max_questions: 5,
        rule: "Exactly 5 unless already fully specified",
      },
    });
    if (!ok) return;
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className="grid gap-3">
      <div className="flex justify-between">
        <p className="text-xs text-gray-500">
          질문 문구·유형·선택지(줄바꿈)를 편집해요. 저장 시 앞에서부터 최대 5개만 반영돼요.
        </p>
        <button
          type="button"
          disabled={rows.length >= 5}
          onClick={() =>
            setRows((r) => [
              ...r,
              {
                id: `q_${Date.now()}`,
                question: "",
                type: "free_text",
                optionsText: "",
                why: "",
              },
            ])
          }
          className="text-xs font-semibold text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + 추가
        </button>
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.id + idx}
          className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800"
        >
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
              className="text-xs text-red-600"
            >
              삭제
            </button>
          </div>
          <label className="grid gap-1 text-xs">
            id
            <input
              className={inputCls}
              value={row.id}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)),
                )
              }
            />
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            질문
            <textarea
              className={inputCls + " min-h-[56px]"}
              value={row.question}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) =>
                    i === idx ? { ...x, question: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            유형
            <select
              className={inputCls}
              value={row.type}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, type: e.target.value } : x)),
                )
              }
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            선택지 (줄바꿈)
            <textarea
              className={inputCls + " min-h-[48px]"}
              value={row.optionsText}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) =>
                    i === idx ? { ...x, optionsText: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="mt-2 grid gap-1 text-xs">
            왜 중요한지
            <textarea
              className={inputCls + " min-h-[40px]"}
              value={row.why}
              onChange={(e) =>
                setRows((r) =>
                  r.map((x, i) => (i === idx ? { ...x, why: e.target.value } : x)),
                )
              }
            />
          </label>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
