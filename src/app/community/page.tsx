"use client";

import { useEffect } from "react";
import CommunityClient from "./CommunityClient";
import { useI18n } from "@/lib/i18n";

export default function CommunityPage() {
  const { tr, lang } = useI18n();

  useEffect(() => {
    document.title = tr("커뮤니티 | Sync Up", "コミュニティ | Sync Up");
  }, [lang, tr]);

  return <CommunityClient />;
}
