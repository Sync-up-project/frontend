"use client";

import { useEffect } from "react";
import CommunityClient from "./CommunityClient";
import { useI18n } from "@/lib/i18n";

export default function CommunityPage() {
  const { tr, lang } = useI18n();

  useEffect(() => {
    // ✅ 언어 전환 시 브라우저 탭 제목도 같이 변경
    document.title = tr("커뮤니티 | Sync Up", "コミュニティ | Sync Up");
  }, [lang, tr]);

  return <CommunityClient />;
}
