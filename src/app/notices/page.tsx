"use client";

import { useEffect } from "react";
import NoticesClient from "./NoticesClient";
import { useI18n } from "@/lib/i18n";

export default function NoticesPage() {
  const { tr, lang } = useI18n();

  useEffect(() => {
    document.title = tr("공지사항 | Sync Up", "お知らせ | Sync Up");
  }, [lang, tr]);

  return <NoticesClient />;
}
