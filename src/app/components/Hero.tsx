"use client";

import { Rocket, Target, MessageCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function Hero() {
  const router = useRouter();
  const { tr } = useI18n();

  function handleCreateProject() {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    router.push("/projects/create");
  }

  function handleJoinProject() {
    router.push("/projects");
  }

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            {tr("팀원 찾기의 어려움을 해결하기 위한", "メンバー探しの難しさを解決するための")}
            <br />
            <span className="text-gray-800">
              {tr("프로젝트 플랫폼", "プロジェクト・プラットフォーム")}
            </span>
          </h1>

          <p className="text-xl text-gray-700 mb-8">
            {tr("프로젝트 생성부터 협업까지", "プロジェクト作成から協業まで")}
            <span className="font-bold text-gray-900"> Sync Up</span>
            {tr("에서", "で")}
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <button
              type="button"
              onClick={handleCreateProject}
              className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {tr("프로젝트 생성하기", "プロジェクトを作成")}
            </button>

            <button
              type="button"
              onClick={handleJoinProject}
              className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 rounded-lg font-medium border border-gray-300 transition-all"
            >
              {tr("프로젝트 참여하기", "プロジェクトに参加")}
            </button>
          </div>
        </div>

        <div className="relative">
          {/* Decorative icons (gray tone) */}
          <div className="absolute -left-8 top-1/4 animate-bounce">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Rocket className="w-10 h-10 text-gray-700" />
            </div>
          </div>

          <div className="absolute -right-8 top-1/3 animate-bounce" style={{ animationDelay: "0.3s" }}>
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <Target className="w-10 h-10 text-gray-700" />
            </div>
          </div>

          <div className="absolute left-12 -bottom-8 animate-bounce" style={{ animationDelay: "0.6s" }}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-gray-700" />
            </div>
          </div>

          {/* Mock dashboard card */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <Users className="w-6 h-6 text-gray-700" />
                  <span className="font-semibold text-gray-900">
                    {tr("팀 프로젝트 대시보드", "チームプロジェクト・ダッシュボード")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-5/6" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-4/6" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-3/6" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-5/6" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-4/6" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-5/6" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-full" />
                    <div className="h-2 bg-gray-300 rounded w-4/6" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-16 -left-16 bg-white rounded-lg shadow-xl p-4 w-48 border border-gray-200 hidden lg:block">
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded w-full" />
                <div className="h-2 bg-gray-200 rounded w-5/6" />
                <div className="h-2 bg-gray-300 rounded w-4/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
