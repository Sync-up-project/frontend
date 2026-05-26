"use client";

import { Megaphone, Users, Handshake } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Features() {
  const { tr } = useI18n();

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {tr(
              "팀원을 구하는데 쓰이는 시간, 노력 대폭 절약",
              "メンバー募集にかかる時間と労力を大幅に削減",
            )}
          </h2>
          <p className="text-xl text-gray-700 dark:text-white/70">
            {tr("팀원들을 빠르게 매칭하고 프로젝트 진행에 집중하세요!", "素早くマッチングして、開発に集中しましょう。")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:bg-white/5 dark:border-white/10">
            <div className="mb-6">
              <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 dark:bg-white/10 dark:border-white/10">
                <Megaphone className="w-24 h-24 text-gray-700 dark:text-white/80" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {tr("프로젝트를 공개하고", "プロジェクトを公開して")}
              <br />
              {tr("팀원을 모집하세요", "メンバーを募集")}
            </h3>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:bg-white/5 dark:border-white/10">
            <div className="mb-6">
              <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 dark:bg-white/10 dark:border-white/10">
                <div className="relative">
                  <Users className="w-24 h-24 text-gray-700 dark:text-white/80" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {tr("프로젝트에 맞는 팀원을 바로 매칭", "最適なメンバーをすぐにマッチング")}
            </h3>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:bg-white/5 dark:border-white/10">
            <div className="mb-6">
              <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 dark:bg-white/10 dark:border-white/10">
                <Handshake className="w-24 h-24 text-gray-700 dark:text-white/80" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {tr("매칭부터 협업까지 한번에!", "マッチングから協業まで一括で。")}
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
}
