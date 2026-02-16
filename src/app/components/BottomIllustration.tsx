"use client";

import { CheckCircle, Calendar, FileText, BarChart3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function BottomIllustration() {
  const { tr } = useI18n();

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          <div className="absolute -top-8 -left-8 animate-bounce" style={{ animationDelay: "0.2s" }}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-gray-700" />
            </div>
          </div>

          <div className="absolute top-12 -right-8 animate-bounce" style={{ animationDelay: "0.4s" }}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center shadow-lg">
              <Calendar className="w-8 h-8 text-gray-700" />
            </div>
          </div>

          <div className="absolute -bottom-8 left-1/4 animate-bounce" style={{ animationDelay: "0.6s" }}>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-gray-700" />
            </div>
          </div>

          <div className="relative bg-gray-100 rounded-3xl p-12 shadow-2xl overflow-hidden border border-gray-200">
            <div className="relative grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-xl transform hover:-translate-y-2 transition-all border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <span className="font-semibold text-gray-900">{tr("프로젝트 A", "プロジェクト A")}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white -ml-3" />
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white -ml-3" />
                </div>
              </div>

              <div
                className="bg-white rounded-2xl p-6 shadow-xl transform hover:-translate-y-2 transition-all border border-gray-200"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <span className="font-semibold text-gray-900">{tr("프로젝트 B", "プロジェクト B")}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white -ml-3" />
                </div>
              </div>

              <div
                className="bg-white rounded-2xl p-6 shadow-xl transform hover:-translate-y-2 transition-all border border-gray-200"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <span className="font-semibold text-gray-900">{tr("프로젝트 C", "プロジェクト C")}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <div className="h-2 bg-gray-200 rounded flex-1" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white -ml-3" />
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white -ml-3" />
                </div>
              </div>
            </div>

            <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
              <div className="flex items-end justify-around h-24">
                <div className="w-12 bg-gray-300 rounded-t-lg" style={{ height: "60%" }} />
                <div className="w-12 bg-gray-300 rounded-t-lg" style={{ height: "80%" }} />
                <div className="w-12 bg-gray-300 rounded-t-lg" style={{ height: "45%" }} />
                <div className="w-12 bg-gray-300 rounded-t-lg" style={{ height: "90%" }} />
                <div className="w-12 bg-gray-300 rounded-t-lg" style={{ height: "70%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
