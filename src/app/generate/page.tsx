"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  DEFAULT_OPEN_AI_BUNDLE_MODEL,
  OPEN_AI_BUNDLE_MODEL_OPTIONS,
  type OpenAiBundleModelId,
} from "@/lib/openai-bundle-models";

const LANGS = ["KO", "EN"] as const;

export default function GenerateDraftPage() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");
  const [language, setLanguage] = useState<(typeof LANGS)[number]>("KO");
  const [openAiModel, setOpenAiModel] = useState<OpenAiBundleModelId>(
    DEFAULT_OPEN_AI_BUNDLE_MODEL,
  );
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
      const me = getCurrentUser();
      const res = await fetch("/api/ai/project/generate-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaText,
          language,
          openAiModel,
          createdById: me?.id ?? undefined,
        }),
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">드래프트 생성</h1>
            <p className="mt-1 text-sm text-gray-600">
              아이디어 한 줄로 드래프트를 생성해요
            </p>
          </div>
          <Link
            href="/drafts"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            드래프트
          </Link>
        </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-gray-900">아이디어 / 행동</label>
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="예: 팀 협업을 위한 AI 기반 프로젝트 플래너"
          rows={6}
          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid max-w-xs gap-2 text-sm">
            <span className="font-semibold">언어</span>
            <select
              value={language}
              onChange={(e) =>
                setLanguage(e.target.value as (typeof LANGS)[number])
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="text-sm">
            <legend className="font-semibold text-gray-900">AI 모델</legend>
            <p className="mt-1 text-xs text-gray-500">
              기획 번들을 만들 때 사용할 OpenAI 모델을 골라요.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {OPEN_AI_BUNDLE_MODEL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 ${
                    openAiModel === opt.id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="openAiModel"
                    value={opt.id}
                    checked={openAiModel === opt.id}
                    onChange={() => setOpenAiModel(opt.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-gray-900">
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {opt.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {errorMsg && (
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMsg}
          </pre>
        )}

        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`mt-5 inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold ${
            canSubmit
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "cursor-not-allowed bg-gray-200 text-gray-500"
          }`}
        >
          {loading ? "생성 중..." : "아이디어 입력 → 드래프트 생성"}
        </button>
      </div>
      </div>
    </div>
  );
}
