// src/app/projects/components/GuestSidebar.tsx
"use client";

import { useI18n } from "@/lib/i18n";

export default function GuestSidebar() {
  const { tr } = useI18n();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-base font-extrabold text-gray-900">{tr("로그인 후 추천을 받아보세요.", "ログインしておすすめを受け取りましょう。")}</p>
      <p className="mt-2 text-sm text-gray-600">
        {tr(
          "스택과 직무를 설정하면, 더 정확한 프로젝트를 보여드립니다.",
          "スタックと職種を設定すると、より精度の高いプロジェクトを表示します。"
        )}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <a
          href="/login"
          className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-800"
        >
          {tr("로그인", "ログイン")}
        </a>
        <a
          href="/signup"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          {tr("회원가입", "新規登録")}
        </a>
      </div>
    </div>
  );
}
