"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import CommunityWriteClient from "./CommunityWriteClient";

export default function CommunityNewPage() {
  const { tr, lang } = useI18n();

  useEffect(() => {
    document.title = tr("커뮤니티 글쓰기 | Sync Up", "コミュニティ 投稿 | Sync Up");
  }, [lang, tr]);

  return <CommunityWriteClient />;
}