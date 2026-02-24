"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DraftViewer from "@/components/draft/DraftViewer";
import { fetchCurrentUser, getCurrentUser } from "@/lib/auth";

const LANG_OPTIONS = ["KO", "EN", "JA"] as const;
const STACK_OPTIONS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "Prisma",
  "Python",
];
const TOOL_OPTIONS = ["Notion", "Figma", "Miro", "GitHub", "Jira", "Slack"];

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toggleItem(list: string[], item: string) {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

export default function DraftDetailPage({
  params,
}: {
  params: { artifactId: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState("");
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [originalLang, setOriginalLang] = useState<(typeof LANG_OPTIONS)[number]>("KO");
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [recruitDeadline, setRecruitDeadline] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const artifactId = params.artifactId;
  const [decisions, setDecisions] = useState<Record<string, any>>({});
  const storageKey = `draft:decisions:${artifactId}`;
  const setupStorageKey = `draft:setup:${artifactId}`;

  const projectId: string | null = data?.meta?.projectId ?? null;

  const decisionsAnswers = (data as any)?.contentJson?.decisions?.answers as
    | Record<string, any>
    | undefined;

  const hasDecisions =
    !!decisionsAnswers &&
    typeof decisionsAnswers === "object" &&
    Object.keys(decisionsAnswers).length > 0;

  type ArtifactStatus = "DRAFT" | "DECIDED" | "CONFIRMED";

  const status: ArtifactStatus = projectId
    ? "CONFIRMED"
    : hasDecisions
    ? "DECIDED"
    : "DRAFT";
  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = getCurrentUser();
      if (mounted) setCurrentUserId(cached?.id ?? null);
      try {
        const fresh = await fetchCurrentUser();
        if (mounted) setCurrentUserId(fresh?.id ?? cached?.id ?? null);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/ai/artifacts/${artifactId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        setErrorMsg(`불러오기 실패: ${res.status} ${res.statusText}\n${t}`);
        setData(null);
        setLoading(false);
        return;
      }

      setData(await res.json());
      setLoading(false);
    })();
  }, [artifactId]);

  useEffect(() => {
    (async () => {
      setRevisionLoading(true);
      setRevisionError(null);
      try {
        const res = await fetch(`/api/ai/artifacts/${artifactId}/revisions`, {
          cache: "no-store",
        });
        const text = await res.text();
        if (!res.ok) {
          setRevisionError(
            `불러오기 실패: ${res.status} ${res.statusText}\n${text}`
          );
          setRevisions([]);
          setRevisionLoading(false);
          return;
        }
        const json = text ? JSON.parse(text) : null;
        setRevisions(json?.items ?? []);
        setRevisionLoading(false);
      } catch (e) {
        setRevisionError(String(e));
        setRevisions([]);
        setRevisionLoading(false);
      }
    })();
  }, [artifactId]);

  useEffect(() => {
    if (!artifactId) return;

    // 1) DB에 저장된 decisions가 있으면 그걸 우선 (Confirm 이후)
    const fromDb = (data as any)?.contentJson?.decisions?.answers;
    if (fromDb && typeof fromDb === "object") {
      setDecisions(fromDb);
      return;
    }

    // 2) Confirm 전이라 DB가 비어있으면 localStorage에서 복원
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDecisions(JSON.parse(raw));
    } catch {}
  }, [artifactId, data]);

  useEffect(() => {
    if (!artifactId) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(decisions ?? {}));
    } catch {}
  }, [artifactId, decisions]);

  const title =
    data?.contentJson?.ideaNormalized?.project_meta?.title ?? "제목 없는 드래프트";
  const oneLiner =
    data?.contentJson?.ideaNormalized?.project_meta?.one_liner ?? "";

  useEffect(() => {
    if (!artifactId || !data) return;
    const setupFromArtifact = (data as any)?.contentJson?.projectSetup ?? {};
    const langFromArtifact = String(
      setupFromArtifact?.originalLang ??
        (data as any)?.contentJson?.ideaNormalized?.project_meta
          ?.primary_language ??
        "KO"
    ).toUpperCase();
    const nextLang = (LANG_OPTIONS as readonly string[]).includes(langFromArtifact)
      ? (langFromArtifact as (typeof LANG_OPTIONS)[number])
      : "KO";

    try {
      const raw = localStorage.getItem(setupStorageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        setOriginalLang(
          (LANG_OPTIONS as readonly string[]).includes(saved?.originalLang)
            ? saved.originalLang
            : nextLang
        );
        setSelectedStacks(Array.isArray(saved?.selectedStacks) ? saved.selectedStacks : []);
        setSelectedTools(Array.isArray(saved?.selectedTools) ? saved.selectedTools : []);
        setRecruitDeadline(saved?.recruitDeadline ?? toInputDate(setupFromArtifact?.deadline ?? null));
        setProjectEndDate(saved?.projectEndDate ?? toInputDate(setupFromArtifact?.endDate ?? null));
        return;
      }
    } catch {
      // ignore
    }

    setOriginalLang(nextLang);
    setSelectedStacks(Array.isArray(setupFromArtifact?.techStacks) ? setupFromArtifact.techStacks : []);
    setSelectedTools(
      Array.isArray(setupFromArtifact?.collaborationTools)
        ? setupFromArtifact.collaborationTools
        : []
    );
    setRecruitDeadline(toInputDate(setupFromArtifact?.deadline ?? null));
    setProjectEndDate(toInputDate(setupFromArtifact?.endDate ?? null));
  }, [artifactId, data, setupStorageKey]);

  useEffect(() => {
    if (!artifactId) return;
    try {
      localStorage.setItem(
        setupStorageKey,
        JSON.stringify({
          originalLang,
          selectedStacks,
          selectedTools,
          recruitDeadline,
          projectEndDate,
        })
      );
    } catch {
      // ignore
    }
  }, [
    artifactId,
    setupStorageKey,
    originalLang,
    selectedStacks,
    selectedTools,
    recruitDeadline,
    projectEndDate,
  ]);

  async function onConfirm() {
    if (!currentUserId) {
      alert("로그인이 필요해요.");
      return;
    }
    if (!recruitDeadline || !projectEndDate) {
      alert("모집 마감일과 프로젝트 마감일을 모두 입력해 주세요.");
      return;
    }
    const descriptionChunks = [
      oneLiner ? `한 줄 소개: ${oneLiner}` : "",
      selectedTools.length > 0 ? `협업 도구: ${selectedTools.join(", ")}` : "",
    ].filter(Boolean);

    setConfirming(true);
    const res = await fetch("/api/projects/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifactId,
        ownerId: currentUserId ?? undefined,
        title,
        mode: "ONLINE",
        difficulty: "MEDIUM",
        decisions,
        originalLang,
        summaryOriginal: oneLiner || title,
        descriptionOriginal: descriptionChunks.join("\n\n"),
        techStacks: selectedStacks,
        collaborationTools: selectedTools,
        deadline: recruitDeadline
          ? new Date(recruitDeadline).toISOString()
          : undefined,
        endDate: projectEndDate
          ? new Date(projectEndDate).toISOString()
          : undefined,
      }),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    setConfirming(false);

    if (!res.ok) {
      // 실패면 localStorage 삭제하면 안 됨(다시 시도해야 하니까)
      alert(json?.message ?? `확정 실패: ${res.status} ${res.statusText}`);
      return;
    }

    // ✅ 성공한 경우에만 localStorage 정리
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(setupStorageKey);
    } catch {}

    // projectId가 응답에 없으면 디버깅용 메시지 출력
    const projectId = json?.project?.id;
    if (!projectId) {
      alert("확정은 완료됐지만 프로젝트 ID가 없어요.");
      console.log("confirm response text:", text);
      return;
    }

    router.push(`/projects/${projectId}`);
  }

  async function onRevise() {
    if (!revisionText.trim() || revisionSubmitting) return;
    setRevisionSubmitting(true);
    try {
      const res = await fetch(`/api/ai/artifacts/${artifactId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: revisionText.trim() }),
      });
      const text = await res.text();
      if (!res.ok) {
        alert(`수정 실패: ${res.status} ${res.statusText}\n${text}`);
        setRevisionSubmitting(false);
        return;
      }
      const json = text ? JSON.parse(text) : null;
      const nextId = json?.meta?.artifactId ?? null;
      if (!nextId) {
        alert("수정은 완료됐지만 새 아티팩트 ID가 없어요.");
        setRevisionSubmitting(false);
        return;
      }
      setRevisionText("");
      router.push(`/drafts/${nextId}`);
    } catch (e) {
      alert(`수정 실패: ${String(e)}`);
    } finally {
      setRevisionSubmitting(false);
    }
  }

  async function onApprove(id: string) {
    const res = await fetch(`/api/ai/artifacts/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const text = await res.text();
    if (!res.ok) {
      alert(`승인 실패: ${res.status} ${res.statusText}\n${text}`);
      return;
    }
    const json = text ? JSON.parse(text) : null;
    if (!json?.approval?.approvedAt) {
      alert("승인 완료 후 상태를 확인할 수 없어요.");
      return;
    }
    const refreshed = await fetch(`/api/ai/artifacts/${artifactId}/revisions`, {
      cache: "no-store",
    });
    const refreshedText = await refreshed.text();
    const refreshedJson = refreshedText ? JSON.parse(refreshedText) : null;
    setRevisions(refreshedJson?.items ?? []);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              아티팩트 ID: <code>{artifactId}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/drafts")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              목록
            </button>
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              프로젝트
            </button>
          </div>
        </div>
      </div>
      {!loading && errorMsg && (
        <pre className="mx-auto mt-2 max-w-screen-2xl rounded-2xl border border-red-200 bg-white p-4 text-xs text-red-700 whitespace-pre-wrap">
          {errorMsg}
        </pre>
      )}

      <div className="mx-auto mt-3 flex max-w-screen-2xl items-center gap-2 px-8 text-sm">
        <span className="rounded-full border px-3 py-1">
          {status === "DRAFT" && "📝 드래프트"}
          {status === "DECIDED" && "✅ 결정사항 저장됨"}
          {status === "CONFIRMED" && "🎉 확정 완료 (프로젝트 생성됨)"}
        </span>

        {status === "CONFIRMED" && projectId && (
          <span className="text-gray-500">
            프로젝트 ID: <code>{projectId}</code>
          </span>
        )}
      </div>

      <div className="mx-auto mt-6 max-w-screen-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">프로젝트 설정</h2>
        <p className="mt-1 text-xs text-gray-500">
          직접 생성과 동일하게 확정 전 설정을 조정할 수 있어요.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold">언어</span>
            <select
              value={originalLang}
              onChange={(e) =>
                setOriginalLang(e.target.value as (typeof LANG_OPTIONS)[number])
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {LANG_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold">모집 마감일</span>
            <input
              type="date"
              value={recruitDeadline}
              onChange={(e) => setRecruitDeadline(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-semibold">프로젝트 마감일</span>
            <input
              type="date"
              value={projectEndDate}
              onChange={(e) => setProjectEndDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold">개발 도구 / 기술 스택</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STACK_OPTIONS.map((stack) => (
              <button
                key={stack}
                type="button"
                onClick={() => setSelectedStacks((prev) => toggleItem(prev, stack))}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  selectedStacks.includes(stack)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {stack}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold">협업 도구</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => setSelectedTools((prev) => toggleItem(prev, tool))}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  selectedTools.includes(tool)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-screen-2xl flex-wrap items-center gap-2 px-8">
        {status !== "CONFIRMED" ? (
          <button
            onClick={onConfirm}
            disabled={confirming || loading}
            className="rounded-xl bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {confirming ? "생성 중..." : "확정 → 프로젝트 생성"}
          </button>
        ) : (
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
          >
            프로젝트 열기 →
          </button>
        )}
      </div>

      <div className="mx-auto mt-6 max-w-screen-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">AI 수정 요청</h2>
        <p className="mt-1 text-xs text-gray-500">
          원하는 변경사항을 적으면 새 드래프트 버전으로 생성돼요.
        </p>
        <textarea
          value={revisionText}
          onChange={(e) => setRevisionText(e.target.value)}
          placeholder="예: API 섹션을 더 구체적으로, ERD는 최소 엔티티 3개로"
          rows={3}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <button
          onClick={onRevise}
          disabled={!revisionText.trim() || revisionSubmitting}
          className="mt-3 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {revisionSubmitting ? "수정 중..." : "AI로 수정 요청"}
        </button>
      </div>

      <div className="mx-auto mt-6 max-w-screen-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">버전 기록</h2>
        {revisionLoading ? (
          <p className="mt-2 text-sm text-gray-500">불러오는 중...</p>
        ) : revisionError ? (
          <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
            {revisionError}
          </pre>
        ) : revisions.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">버전 기록이 없어요.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {revisions.map((r) => {
              const approval = r?.contentJson?.approval;
              const revision = r?.contentJson?.revision;
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                      v{r.version}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                    {approval?.approvedAt && (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        승인됨
                      </span>
                    )}
                    <button
                      onClick={() => router.push(`/drafts/${r.id}`)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                    >
                      이 버전 보기
                    </button>
                    {!approval?.approvedAt && (
                      <button
                        onClick={() => onApprove(r.id)}
                        className="ml-auto rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                      >
                        이 버전 승인
                      </button>
                    )}
                  </div>
                  {revision?.instruction && (
                    <div className="mt-2 text-xs text-gray-600">
                      수정 지시: {revision.instruction}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mx-auto mt-6 max-w-screen-2xl rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-900 shadow-sm">
        {loading && <p>불러오는 중...</p>}
        {!loading && !data && <p>드래프트를 찾을 수 없어요.</p>}
        {!loading && data && (
          <DraftViewer
            contentJson={data.contentJson}
            decisions={decisions}
            onDecisionsChange={setDecisions}
            readOnly={status === "CONFIRMED"}
          />
        )}
      </div>
    </div>
  );
}
