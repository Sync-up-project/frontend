"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "KR" | "JP";

const STORAGE_KEY = "syncup_lang";

type I18nContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  tr: (kr: string, jp: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLang(v: unknown): v is Lang {
  return v === "KR" || v === "JP";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // ✅ SSR/CSR 첫 렌더를 동일하게 만들기 위해 기본값은 KR 고정
  const [lang, setLangState] = useState<Lang>("KR");
  const [hydrated, setHydrated] = useState(false);

  // ✅ 클라이언트에서만 저장된 언어를 반영 (첫 렌더 이후)
  useEffect(() => {
    setHydrated(true);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) setLangState(saved);
    } catch {
      // ignore
    }
  }, []);

  // HTML lang 속성 반영 + localStorage 저장
  useEffect(() => {
    if (!hydrated) return;

    try {
      document.documentElement.lang = lang === "KR" ? "ko" : "ja";
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang, hydrated]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      lang,
      setLang: (next) => setLangState(next),
      tr: (kr, jp) => (lang === "JP" ? jp : kr),
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider.");
  return ctx;
}
