"use client";

import { Suspense, useEffect } from "react";
import CommunityClient from "./CommunityClient";
import { useI18n } from "@/lib/i18n";

export default function CommunityPage() {
  const { tr, lang } = useI18n();

  useEffect(() => {
    document.title = tr("커뮤니티 | Sync Up", "コミュニティ | Sync Up");
  }, [lang, tr]);

  // useSearchParams() 를 쓰는 컴포넌트는 Suspense 경계가 필요합니다 (Next.js 14 빌드 규칙)
  return (
    <Suspense fallback={null}>
      <CommunityClient />
    </Suspense>
  );
}
