"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import DraftViewer from "@/components/draft/DraftViewer";

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
  const artifactId = params.artifactId;
  const [decisions, setDecisions] = useState<Record<string, any>>({});
  const storageKey = `draft:decisions:${artifactId}`;

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

  async function onConfirm() {
    setConfirming(true);
    const res = await fetch("/api/projects/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artifactId,
        title,
        mode: "ONLINE",
        difficulty: "MEDIUM",
        decisions,
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
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-neutral-400">
            아티팩트 ID: <code>{artifactId}</code>
          </p>
        </div>
        <ThemeToggle />
      </div>
      {!loading && errorMsg && (
        <pre className="mt-3 rounded-lg border p-3 text-xs text-red-600 whitespace-pre-wrap">
          {errorMsg}
        </pre>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="rounded-full border px-3 py-1">
          {status === "DRAFT" && "📝 드래프트"}
          {status === "DECIDED" && "✅ 결정사항 저장됨"}
          {status === "CONFIRMED" && "🎉 확정 완료 (프로젝트 생성됨)"}
        </span>

        {status === "CONFIRMED" && projectId && (
          <span className="text-gray-500 dark:text-neutral-400">
            프로젝트 ID: <code>{projectId}</code>
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {status !== "CONFIRMED" ? (
          <button
            onClick={onConfirm}
            disabled={confirming || loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {confirming ? "생성 중..." : "확정 → 프로젝트 생성"}
          </button>
        ) : (
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700"
          >
            프로젝트 열기 →
          </button>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-lg font-semibold">AI 수정 요청</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
          원하는 변경사항을 적으면 새 드래프트 버전으로 생성돼요.
        </p>
        <textarea
          value={revisionText}
          onChange={(e) => setRevisionText(e.target.value)}
          placeholder="예: API 섹션을 더 구체적으로, ERD는 최소 엔티티 3개로"
          rows={3}
          className="mt-3 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        />
        <button
          onClick={onRevise}
          disabled={!revisionText.trim() || revisionSubmitting}
          className="mt-3 inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {revisionSubmitting ? "수정 중..." : "AI로 수정 요청"}
        </button>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
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
                  className="rounded-lg border bg-gray-50 px-3 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">
                      v{r.version}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-neutral-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                    {approval?.approvedAt && (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                        승인됨
                      </span>
                    )}
                    <button
                      onClick={() => router.push(`/drafts/${r.id}`)}
                      className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-neutral-800"
                    >
                      이 버전 보기
                    </button>
                    {!approval?.approvedAt && (
                      <button
                        onClick={() => onApprove(r.id)}
                        className="ml-auto rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-neutral-800"
                      >
                        이 버전 승인
                      </button>
                    )}
                  </div>
                  {revision?.instruction && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-neutral-300">
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
      <div className="mt-6 rounded-xl border bg-gray-50 p-4 text-sm text-gray-900 dark:bg-neutral-950 dark:text-neutral-100 dark:border-neutral-800">
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
