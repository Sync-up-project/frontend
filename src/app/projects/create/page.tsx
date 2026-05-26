// src/app/projects/create/page.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { getAccessToken } from "@/lib/auth";

export default function ProjectCreateChooserPage() {
  const { tr, lang } = useI18n();
  const router = useRouter();

  useEffect(() => {
    document.title = tr("프로젝트 생성 | Sync Up", "プロジェクト作成 | Sync Up");
  }, [lang, tr]);

  // ✅ 비로그인 직접 접근 차단: 알림 → 로그인 이동
  useEffect(() => {
    if (!getAccessToken()) {
      alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
      router.replace("/login");
    }
  }, [router, tr]);

  function requireLoginThen(to: string) {
    if (getAccessToken()) {
      router.push(to);
      return;
    }
    alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {tr("프로젝트 생성 방식 선택", "作成方法の選択")}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-white/70">
              {tr(
                "바로 생성할지, 드래프트를 만든 뒤 확정할지 선택하세요.",
                "すぐ作成するか、ドラフト作成→確定で作成するかを選んでください。"
              )}
            </p>
          </div>

          <Link
            href="/projects"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            {tr("프로젝트 목록", "プロジェクト一覧")}
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* 직접 생성 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {tr("직접 생성", "手動で作成")}
              </h2>
              <p className="text-sm text-gray-600 dark:text-white/70">
                {tr(
                  "제목/기간/스택/모집 포지션 등 모든 항목을 직접 입력하고 바로 프로젝트를 생성합니다.",
                  "タイトル/期間/スタック/募集ポジションなどを入力して、すぐにプロジェクトを作成します。"
                )}
              </p>
            </div>

            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-white/70">
              <li>{tr("폼 입력이 익숙할 때", "フォーム入力に慣れている場合")}</li>
              <li>{tr("요구사항이 이미 정리돼 있을 때", "要件が固まっている場合")}</li>
              <li>{tr("빠르게 프로젝트를 만들어야 할 때", "すぐ作りたい場合")}</li>
            </ul>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => requireLoginThen("/projects/new")}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
              >
                {tr("직접 생성 시작", "手動作成を開始")}
              </button>
            </div>
          </div>

          {/* 자동 생성 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {tr("자동 생성 (드래프트)", "自動生成（ドラフト）")}
              </h2>
              <p className="text-sm text-gray-600 dark:text-white/70">
                {tr(
                  "아이디어 한 줄로 드래프트를 먼저 만든 뒤, 내용을 확인/수정하고 확정(Confirm)하면 프로젝트가 생성됩니다.",
                  "アイデアからドラフトを作成し、内容を確認/編集して確定するとプロジェクトが作成されます。"
                )}
              </p>
            </div>

            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-white/70">
              <li>{tr("아이디어만 있고 구체화가 필요할 때", "アイデアを具体化したい場合")}</li>
              <li>{tr("초안 검토 후 확정해서 생성하고 싶을 때", "確認してから作成したい場合")}</li>
              <li>{tr("여러 후보안을 만들어 비교하고 싶을 때", "複数案を比較したい場合")}</li>
            </ul>

            <div className="mt-6">
              <Link
                href="/generate"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
              >
                {tr("자동 생성 시작", "自動生成を開始")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm">
          <p className="font-semibold">{tr("정리", "まとめ")}</p>
          <p className="mt-2 leading-6">
            {tr(
              "직접 생성은 곧바로 프로젝트(DB)를 만들고, 자동 생성은 드래프트를 만든 뒤 확정할 때 프로젝트(DB)를 만드는 방식이에요.",
              "手動作成はすぐにプロジェクト（DB）を作成し、自動生成はドラフトを作って確定時にプロジェクト（DB）を作成します。"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
