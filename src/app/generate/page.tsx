"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESETS = ["LIGHT", "MEDIUM", "HEAVY"] as const;
const LANGS = ["KO", "EN"] as const;

export default function GenerateDraftPage() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");
  const [language, setLanguage] = useState<(typeof LANGS)[number]>("KO");
  const [mockPreset, setMockPreset] =
    useState<(typeof PRESETS)[number]>("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = ideaText.trim().length > 0 && !loading;

  const pollJob = async (jobId: string) => {
    const maxAttempts = 120;
    const delayMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetch(`/api/ai/project/generate-status/${jobId}`, {
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) {
        setErrorMsg(`생성 실패: ${res.status} ${res.statusText}\n${text}`);
        setLoading(false);
        return;
      }

      const json = text ? JSON.parse(text) : null;
      if (json?.status === "done") {
        const artifactId = json?.result?.meta?.artifactId ?? null;
        if (!artifactId) {
          setErrorMsg("생성은 완료됐지만 artifactId가 없어요.");
          setLoading(false);
          return;
        }
        router.push(`/drafts/${artifactId}`);
        return;
      }

      if (json?.status === "error") {
        const msg = json?.error?.message ?? "알 수 없는 오류";
        setErrorMsg(`생성 실패: ${msg}`);
        setLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    setErrorMsg("생성이 너무 오래 걸려요. 다시 시도해주세요.");
    setLoading(false);
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai/project/generate-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaText, language, mockPreset }),
      });
      const text = await res.text();
      if (!res.ok) {
        setErrorMsg(`생성 실패: ${res.status} ${res.statusText}\n${text}`);
        setLoading(false);
        return;
      }
      const json = text ? JSON.parse(text) : null;
      const jobId = json?.jobId ?? null;
      if (!jobId) {
        setErrorMsg("생성을 시작했지만 jobId가 없어요.");
        setLoading(false);
        return;
      }
      await pollJob(jobId);
    } catch (e) {
      setErrorMsg(String(e));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">드래프트 생성</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            아이디어 한 줄로 드래프트를 생성해요 (Mock provider)
          </p>
        </div>
        <Link
          href="/drafts"
          className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-neutral-900"
        >
          드래프트
        </Link>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <label className="text-sm font-semibold">아이디어 / 행동</label>
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="예: 팀 협업을 위한 AI 기반 프로젝트 플래너"
          rows={6}
          className="mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold">언어</span>
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as (typeof LANGS)[number])
              }
              className="rounded-lg border bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              {LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold">Mock 프리셋</span>
            <select
              value={mockPreset}
              onChange={(e) =>
                setMockPreset(e.target.value as (typeof PRESETS)[number])
              }
              className="rounded-lg border bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              {PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </label>
        </div>

        {errorMsg && (
          <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
            {errorMsg}
          </pre>
        )}

        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`mt-5 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold ${
            canSubmit
              ? "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black"
              : "cursor-not-allowed bg-gray-200 text-gray-500 dark:bg-neutral-800 dark:text-neutral-500"
          }`}
        >
          {loading ? "생성 중..." : "아이디어 입력 → 드래프트 생성"}
        </button>
      </div>
    </div>
  );
}
