"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { tr } = useI18n();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900">Sync Up</p>
            <p className="mt-2 text-sm text-gray-600">
              {tr(
                "팀원 모집부터 협업까지, 프로젝트 진행을 더 빠르고 명확하게.",
                "募集から協業まで、プロジェクト進行をより速く、明確に。",
              )}
            </p>
            <p className="mt-4 text-xs text-gray-500">© {new Date().getFullYear()} Sync Up</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">{tr("바로가기", "リンク")}</p>
              <div className="flex flex-col gap-2">
                <Link href="/projects" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {tr("프로젝트", "プロジェクト")}
                </Link>
                <Link href="/community" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {tr("커뮤니티", "コミュニティ")}
                </Link>
                <Link href="/notices" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {tr("공지사항", "お知らせ")}
                </Link>
                <Link href="/mypage" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {tr("마이페이지", "マイページ")}
                </Link>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-900">{tr("정책", "ポリシー")}</p>
              <div className="flex flex-col gap-2">
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {tr("서비스 이용약관", "利用規約")}
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {tr("개인정보 처리방침", "プライバシーポリシー")}
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {tr("문의", "お問い合わせ")}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500">
          {tr(
            "현재는 프론트 단독 모드이며, 일부 기능은 추후 백엔드 연동으로 확장됩니다.",
            "現在はフロント単独モードで、一部機能は後ほどバックエンド連携で拡張されます。",
          )}
        </div>
      </div>
    </footer>
  );
}
