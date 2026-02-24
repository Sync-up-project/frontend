"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import CommunityDetailClient from "./CommunityDetailClient";

export default function CommunityDetailPage() {
  const { tr, lang } = useI18n();

  useEffect(() => {
    document.title = tr("커뮤니티 | Sync Up", "コミュニティ | Sync Up");
  }, [lang, tr]);

  return <CommunityDetailClient />;
}