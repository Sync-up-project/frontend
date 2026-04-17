"use client";

import { useMemo, useState } from "react";
import ErdMermaidDiagram from "./ErdMermaidDiagram";

type TabKey = "idea" | "screens" | "erd" | "questions";

export default function DraftViewer({
  contentJson,
  decisions,
  onDecisionsChange,
  readOnly = true,
}: {
  contentJson: any;
  decisions?: Record<string, any>;
  onDecisionsChange?: (next: Record<string, any>) => void;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("idea");

  const content = contentJson ?? null;
  const idea = content?.ideaNormalized;

  const view =
    tab === "idea"
      ? content?.ideaNormalized
      : tab === "screens"
      ? content?.screens
      : tab === "erd"
      ? content?.erd
      : content?.questions;

  return (
    <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-900 dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(["idea", "screens", "erd", "questions"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold border
              ${
                tab === t
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white text-gray-800 hover:bg-gray-100 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900 dark:border-neutral-800"
              }`}
          >
            {t === "idea"
              ? "아이디어"
              : t === "screens"
              ? "화면"
              : t === "erd"
              ? "ERD"
              : "질문"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {tab === "idea" ? (
          !idea ? (
            <div className="text-sm text-gray-500 dark:text-neutral-400">
              아직 아이디어 정보가 없어요.
            </div>
          ) : (
            <IdeaCards idea={idea} />
          )
        ) : tab === "screens" ? (
          <ScreensView
            screens={content?.screens}
            apiSpec={content?.apiSpec}
          />
        ) : tab === "erd" ? (
          <ErdView erd={content?.erd} />
        ) : tab === "questions" ? (
          <QuestionsView
            questions={content?.questions}
            value={decisions ?? content?.decisions?.answers ?? {}}
            readOnly={readOnly}
            onChange={onDecisionsChange}
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words text-xs mt-2">
            {JSON.stringify(view ?? { message: "내용이 아직 없어요." }, null, 2)}
          </pre>
        )}
      </div>
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
    gray: "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-200",
    indigo:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
          {title}
        </h3>
        {right}
      </div>
      <div className="mt-3 text-sm text-gray-700 dark:text-neutral-200">
        {children}
      </div>
    </section>
  );
}

function safeArr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function IdeaCards({ idea }: { idea: any }) {
  const headerBadges = useMemo(() => {
    return (
      <div className="flex flex-wrap gap-2">
        <Badge tone="indigo">{idea?.project_meta?.domain ?? "도메인"}</Badge>
        <Badge tone="gray">
          {safeArr(idea?.project_meta?.target_platforms).join(", ") ||
            "플랫폼"}
        </Badge>
        <Badge tone="emerald">
          {idea?.project_meta?.primary_language ?? "언어"}
        </Badge>
      </div>
    );
  }, [idea]);

  return (
    <div className="grid gap-4 mt-2">
      {/* 헤더 요약 */}
      <Card
        title={idea?.project_meta?.title ?? "제목 없음"}
        right={headerBadges}
      >
        <p className="text-gray-600 dark:text-neutral-300">
          {idea?.project_meta?.one_liner ?? "요약 문장이 아직 없어요."}
        </p>
      </Card>

      {/* 문제/해결 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="문제">
          <p className="text-gray-700 dark:text-neutral-200">
            {idea?.problem_solution?.problem_statement ?? "-"}
          </p>
        </Card>
        <Card title="해결">
          <p className="text-gray-700 dark:text-neutral-200">
            {idea?.problem_solution?.solution_summary ?? "-"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {safeArr(idea?.problem_solution?.unique_value).map(
              (v: string, idx: number) => (
                <Badge key={idx} tone="emerald">
                  {v}
                </Badge>
              )
            )}
          </div>
        </Card>
      </div>

      {/* 핵심 기능 */}
      <Card
        title="핵심 기능"
        right={
          <Badge tone="gray">{safeArr(idea?.features).length}개</Badge>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {safeArr(idea?.features).map((f: any, idx: number) => (
            <div
              key={idx}
              className="rounded-lg border p-3 dark:border-neutral-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold">{f?.name ?? "기능"}</div>
                <Badge tone={f?.priority === "must" ? "rose" : "amber"}>
                  {f?.priority ?? "우선순위"}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-neutral-300">
                {f?.description ?? "-"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {safeArr(f?.complexity_triggers).map((t: string, j: number) => (
                  <Badge key={j} tone="gray">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 역할 */}
      <Card
        title="사용자/역할"
        right={
          <Badge tone="gray">
            {safeArr(idea?.users_and_roles).length}개
          </Badge>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-gray-500 dark:text-neutral-400">
              <tr className="border-b dark:border-neutral-800">
                <th className="py-2 pr-3">역할</th>
                <th className="py-2 pr-3">설명</th>
                <th className="py-2">권한</th>
              </tr>
            </thead>
            <tbody>
              {safeArr(idea?.users_and_roles).map((r: any, idx: number) => (
                <tr key={idx} className="border-b dark:border-neutral-800">
                  <td className="py-3 pr-3 font-semibold">{r?.role ?? "-"}</td>
                  <td className="py-3 pr-3 text-gray-600 dark:text-neutral-300">
                    {r?.description ?? "-"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {safeArr(r?.key_permissions).map(
                        (p: string, j: number) => (
                          <Badge key={j} tone="gray">
                            {p}
                          </Badge>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 플로우 + 제약/가정 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="핵심 사용자 흐름">
          <div className="grid gap-3">
            {safeArr(idea?.core_user_flows).map((flow: any, idx: number) => (
              <div
                key={idx}
                className="rounded-lg border p-3 dark:border-neutral-800"
              >
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{flow?.name ?? "흐름"}</div>
                  <Badge tone="indigo">{flow?.actor_role ?? "역할"}</Badge>
                </div>
                <ol className="mt-2 list-decimal pl-5 text-xs text-gray-600 dark:text-neutral-300">
                  {safeArr(flow?.steps).map((s: string, j: number) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Card>

        <Card title="가정 / 품질 플래그">
          <div className="flex flex-wrap gap-2">
            <Badge tone="gray">
              범위 불명확: {idea?.quality_flags?.ambiguous_scope ?? "-"}
            </Badge>
            <Badge tone="gray">
              역할 누락:{" "}
              {idea?.quality_flags?.missing_role_definitions ?? "-"}
            </Badge>
            <Badge tone="gray">
              불확실 위험: {idea?.quality_flags?.high_risk_uncertainty ?? "-"}
            </Badge>
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
              가정
            </div>
            <ul className="mt-2 list-disc pl-5 text-xs text-gray-600 dark:text-neutral-300">
              {safeArr(idea?.assumptions).map((a: string, idx: number) => (
                <li key={idx}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
              비기능 요구사항
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {safeArr(idea?.non_functional_requirements?.security).map(
                (s: string, idx: number) => (
                  <Badge key={idx} tone="emerald">
                    {s}
                  </Badge>
                )
              )}
              {safeArr(idea?.non_functional_requirements?.performance).map(
                (p: string, idx: number) => (
                  <Badge key={idx} tone="amber">
                    {p}
                  </Badge>
                )
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function methodTone(m?: string) {
  const mm = (m ?? "").toUpperCase();
  if (mm === "GET") return "emerald";
  if (mm === "POST") return "indigo";
  if (mm === "PUT" || mm === "PATCH") return "amber";
  if (mm === "DELETE") return "rose";
  return "gray";
}

/** apiSpec.endpoints 와 화면 required_apis 매칭용 */
function apiEndpointKey(method?: string, path?: string) {
  return `${String(method ?? "").toUpperCase().trim()} ${String(path ?? "").trim()}`.trim();
}

function endpointAuthByMethodPath(apiSpec: any): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of safeArr(apiSpec?.endpoints)) {
    const k = apiEndpointKey(e?.method, e?.path);
    if (k && !m.has(k)) m.set(k, String(e?.auth_required ?? ""));
  }
  return m;
}

function screenAuthBadge(auth?: string) {
  const tone = auth === "yes" ? "rose" : "gray";
  const label =
    auth === "yes"
      ? "필요"
      : auth === "no"
      ? "불필요"
      : "알 수 없음";
  return { tone, label } as const;
}

function ScreensView({
  screens,
  apiSpec,
}: {
  screens: any;
  apiSpec: any;
}) {
  const list = safeArr(screens?.screens);
  const nav = safeArr(screens?.navigation);
  const epAuth = useMemo(
    () => endpointAuthByMethodPath(apiSpec),
    [apiSpec],
  );

  return (
    <div className="mt-2 grid gap-4">
      <Card
        title="화면"
        right={<Badge tone="gray">{list.length}개</Badge>}
      >
        {list.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            화면이 없어요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 dark:text-neutral-400">
                <tr className="border-b dark:border-neutral-800">
                  <th className="py-2 pr-3">이름</th>
                  <th className="py-2 pr-3">경로</th>
                  <th className="py-2 pr-3">역할</th>
                  <th className="py-2 pr-3">화면 인증</th>
                  <th className="py-2">API</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s: any) => {
                  const scr = screenAuthBadge(s?.permissions?.auth_required);
                  return (
                    <tr
                      key={s?.id ?? Math.random()}
                      className="border-b dark:border-neutral-800"
                    >
                      <td className="py-3 pr-3 font-semibold">
                        {s?.name ?? "-"}
                        <div className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                          {s?.goal ?? ""}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <code className="text-xs">{s?.route ?? "-"}</code>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-2">
                          {safeArr(s?.actor_roles).map(
                            (r: string, idx: number) => (
                              <Badge key={idx} tone="indigo">
                                {r}
                              </Badge>
                            ),
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={scr.tone as any}>{scr.label}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col gap-2">
                          {safeArr(s?.required_apis).map(
                            (a: any, idx: number) => {
                              const k = apiEndpointKey(a?.method, a?.path);
                              const ar = epAuth.get(k);
                              return (
                                <div
                                  key={idx}
                                  className="flex flex-col gap-1 rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/60"
                                >
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      tone={methodTone(a?.method) as any}
                                    >
                                      {a?.method ?? "?"}
                                    </Badge>
                                    <code className="text-xs">
                                      {a?.path ?? "-"}
                                    </code>
                                    {ar === "yes" || ar === "no" ? (
                                      <Badge
                                        tone={
                                          ar === "yes" ? "rose" : "gray"
                                        }
                                      >
                                        {ar === "yes"
                                          ? "API 인증 필요"
                                          : "API 인증 불필요"}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  {a?.purpose ? (
                                    <span className="text-xs text-gray-500 dark:text-neutral-400">
                                      {a.purpose}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="내비게이션"
        right={<Badge tone="gray">{nav.length}개</Badge>}
      >
        {nav.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            연결이 없어요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nav.map((n: any, idx: number) => (
              <Badge key={idx} tone="gray">
                {n?.from_screen_id ?? "?"} → {n?.to_screen_id ?? "?"}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const ERD_COL_PREVIEW = 6;

function ErdEntityCard({ entity }: { entity: any }) {
  const [expanded, setExpanded] = useState(false);
  const cols = safeArr(entity?.columns);
  const idxs = safeArr(entity?.indexes);
  const pkCount = cols.filter((c: any) => c?.pk === "yes").length;
  const hasMore = cols.length > ERD_COL_PREVIEW;
  const visibleCols = expanded || !hasMore ? cols : cols.slice(0, ERD_COL_PREVIEW);

  return (
    <div className="rounded-lg border p-3 bg-white dark:bg-neutral-950 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{entity?.name ?? "엔티티"}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
            {entity?.description ?? "-"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Badge tone="indigo">컬럼: {cols.length}</Badge>
          <Badge tone="gray">PK: {pkCount}</Badge>
          <Badge tone="gray">인덱스: {idxs.length}</Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {visibleCols.map((c: any, i: number) => (
          <div
            key={`${String(c?.name)}-${i}`}
            className="flex flex-wrap items-center gap-2 text-xs"
          >
            <code className="rounded bg-gray-100 px-2 py-0.5 text-gray-800 dark:bg-neutral-900 dark:text-neutral-100">
              {c?.name ?? "col"}
            </code>
            <Badge tone="gray">{c?.type ?? "type"}</Badge>
            {c?.pk === "yes" && <Badge tone="rose">PK</Badge>}
            {c?.unique === "yes" && <Badge tone="amber">UNIQUE</Badge>}
            {c?.nullable === "no" && <Badge tone="emerald">NOT NULL</Badge>}
          </div>
        ))}

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-left text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline dark:text-indigo-300 dark:hover:text-indigo-100"
          >
            {expanded
              ? "컬럼 접기"
              : `+${cols.length - ERD_COL_PREVIEW}개 컬럼 더 보기`}
          </button>
        )}
      </div>
    </div>
  );
}

function ErdView({ erd }: { erd: any }) {
  const entities = safeArr(erd?.entities);
  const rels = safeArr(erd?.relationships);

  return (
    <div className="mt-2 grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone="gray">엔티티: {entities.length}</Badge>
        <Badge tone="gray">관계: {rels.length}</Badge>
        <Badge tone="gray">
          {erd?.common_conventions?.id_strategy ?? "id 전략?"}
        </Badge>
        <Badge tone="gray">
          {erd?.common_conventions?.timestamps ?? "타임스탬프?"}
        </Badge>
      </div>

      <Card title="다이어그램 (Mermaid)" right={null}>
        <ErdMermaidDiagram erd={erd} className="border-0 bg-transparent shadow-none" />
      </Card>

      <Card
        title="엔티티"
        right={<Badge tone="gray">{entities.length}</Badge>}
      >
        {entities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            엔티티가 없어요.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {entities.map((e: any, idx: number) => (
              <ErdEntityCard
                key={`${String(e?.name ?? "entity")}-${idx}`}
                entity={e}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title="관계"
        right={<Badge tone="gray">{rels.length}</Badge>}
      >
        {rels.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            관계가 없어요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 dark:text-neutral-400">
                <tr className="border-b dark:border-neutral-800">
                  <th className="py-2 pr-3">출발</th>
                  <th className="py-2 pr-3">대상</th>
                  <th className="py-2 pr-3">관계</th>
                  <th className="py-2">삭제 규칙</th>
                </tr>
              </thead>
              <tbody>
                {rels.map((r: any, idx: number) => (
                  <tr key={idx} className="border-b dark:border-neutral-800">
                    <td className="py-3 pr-3">
                      <code className="text-xs">
                        {r?.from_entity ?? "?"}.{r?.from_column ?? "?"}
                      </code>
                    </td>
                    <td className="py-3 pr-3">
                      <code className="text-xs">
                        {r?.to_entity ?? "?"}.{r?.to_column ?? "?"}
                      </code>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge tone="indigo">{r?.cardinality ?? "-"}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge tone="gray">{r?.on_delete ?? "알 수 없음"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function QuestionsView({
  questions,
  value,
  onChange,
  readOnly,
}: {
  questions: any;
  value: Record<string, any>;
  onChange?: (next: Record<string, any>) => void;
  readOnly: boolean;
}) {
  const list = safeArr(questions?.questions);
  const policy = questions?.limit_policy;

  const setAnswer = (id: string, v: any) => {
    const next = { ...(value ?? {}), [id]: v };
    onChange?.(next);
  };

  return (
    <div className="mt-2 grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone="gray">질문 수: {list.length}</Badge>
        {policy?.max_questions != null && (
          <Badge tone="gray">최대: {policy.max_questions}</Badge>
        )}
        {policy?.rule && <Badge tone="gray">{policy.rule}</Badge>}
      </div>

      <Card
        title="추가 확인 질문"
        right={<Badge tone="gray">{list.length}</Badge>}
      >
        {list.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            질문이 없어요.
          </p>
        ) : (
          <div className="grid gap-3">
            {list.map((q: any) => {
              const id = q?.id ?? "Q";
              const options = safeArr(q?.options);
              const impacts = safeArr(q?.impacts);
              const current = value?.[id];

              return (
                <div
                  key={id}
                  className="rounded-lg border bg-white p-3 dark:bg-neutral-950 dark:border-neutral-800"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="indigo">{id}</Badge>
                    <Badge tone="gray">{q?.type ?? "유형"}</Badge>
                    {q?.default != null && (
                      <Badge tone="emerald">기본값: {String(q.default)}</Badge>
                    )}
                    {current != null && (
                      <Badge tone="amber">선택: {String(current)}</Badge>
                    )}
                  </div>

                  <div className="mt-2 font-semibold text-gray-900 dark:text-neutral-100">
                    {q?.question ?? "-"}
                  </div>

                  {q?.why_it_matters && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-neutral-300">
                      {q.why_it_matters}
                    </div>
                  )}

                  {/* 선택 UI */}
                  <div className="mt-3">
                    {options.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={readOnly}
                            onClick={() => setAnswer(id, opt)}
                            className={`rounded-md border px-3 py-1.5 text-xs font-semibold
                                ${
                                  current === opt
                                    ? "bg-black text-white dark:bg-white dark:text-black"
                                    : "bg-white text-gray-800 hover:bg-gray-100 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900 dark:border-neutral-800"
                                }
                                ${
                                  readOnly
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                                }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : q?.type === "boolean" ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => setAnswer(id, true)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                            current === true
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-white text-gray-800 hover:bg-gray-100 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900 dark:border-neutral-800"
                          } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          예
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => setAnswer(id, false)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                            current === false
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-white text-gray-800 hover:bg-gray-100 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900 dark:border-neutral-800"
                          } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          아니오
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-neutral-400">
                        (선택 가능한 옵션이 없어요)
                      </p>
                    )}
                  </div>

                  {impacts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 dark:text-neutral-400">
                        영향:
                      </span>
                      {impacts.map((i: string, idx: number) => (
                        <Badge key={idx} tone="amber">
                          {i}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
