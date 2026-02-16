"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getAccessToken } from "@/lib/auth";

type Notice = {
  id: string;
  titleKr: string;
  titleJp: string;
  contentKr: string;
  contentJp: string;
  createdAt: string; // ISO
  pinned?: boolean;
};

const LOCAL_NOTICES_KEY = "syncup_local_notices";
const LOCAL_IS_ADMIN_KEY = "syncup_is_admin"; // ✅ 데모용: localStorage에 "true"면 어드민으로 간주

function uid(prefix = "n") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatDate(iso: string, locale: "ko" | "ja") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return locale === "ko" ? `${y}.${m}.${day}` : `${y}/${m}/${day}`;
}

export default function NoticesClient() {
  const { tr, lang } = useI18n();

  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [query, setQuery] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    // ✅ auth/admin 상태 동기화
    const syncAuth = () => {
      try {
        setIsAuthed(Boolean(getAccessToken()));
      } catch {
        setIsAuthed(false);
      }
    };

    const syncAdmin = () => {
      try {
        setIsAdmin(localStorage.getItem(LOCAL_IS_ADMIN_KEY) === "true");
      } catch {
        setIsAdmin(false);
      }
    };

    const seedIfEmpty = () => {
      const current = safeParseJson<Notice[]>(localStorage.getItem(LOCAL_NOTICES_KEY), []);
      if (current.length > 0) return;

      const now = Date.now();
      const mk = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

      const seeded: Notice[] = [
        {
          id: uid(),
          pinned: true,
          titleKr: "서비스 이용 안내",
          titleJp: "サービス利用のご案内",
          contentKr: "현재는 프론트 단독 모드입니다. 일부 기능은 추후 백엔드 연동으로 확장됩니다.",
          contentJp: "現在はフロント単独モードです。一部機能は後ほどバックエンド連携で拡張されます。",
          createdAt: mk(60),
        },
        {
          id: uid(),
          titleKr: "커뮤니티 이용 규칙",
          titleJp: "コミュニティ利用ルール",
          contentKr: "서로 존중하는 표현을 사용해 주세요. 개인정보 공유는 지양해 주세요.",
          contentJp: "互いに尊重した表現を使ってください。個人情報の共有は控えてください。",
          createdAt: mk(420),
        },
        {
          id: uid(),
          titleKr: "프로젝트 모집 글 작성 팁",
          titleJp: "募集投稿の書き方（ヒント）",
          contentKr: "목표, 역할, 기간, 스택, 협업 도구를 짧고 명확하게 작성하면 매칭이 빨라집니다.",
          contentJp: "目的、役割、期間、技術、協業ツールを短く明確に書くとマッチングが速くなります。",
          createdAt: mk(980),
        },
        {
          id: uid(),
          titleKr: "점검 안내",
          titleJp: "メンテナンスのお知らせ",
          contentKr: "UI 개선 작업이 진행 중입니다. 화면이 일부 변경될 수 있습니다.",
          contentJp: "UI改善作業を進めています。画面が一部変更される可能性があります。",
          createdAt: mk(1440),
        },
      ];

      localStorage.setItem(LOCAL_NOTICES_KEY, JSON.stringify(seeded));
    };

    const syncNotices = () => {
      try {
        const list = safeParseJson<Notice[]>(localStorage.getItem(LOCAL_NOTICES_KEY), []);
        const sorted = [...list].sort((a, b) => {
          // pinned 먼저
          if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
          return a.createdAt < b.createdAt ? 1 : -1;
        });
        setNotices(sorted);
      } catch {
        setNotices([]);
      }
    };

    seedIfEmpty();
    syncAuth();
    syncAdmin();
    syncNotices();

    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_NOTICES_KEY) syncNotices();
      if (e.key === LOCAL_IS_ADMIN_KEY) syncAdmin();
      if (e.key === "syncup_access_token") syncAuth();
    };

    const onAuthChanged = () => syncAuth();

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onAuthChanged);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notices;

    return notices.filter((n) => {
      const title = tr(n.titleKr, n.titleJp).toLowerCase();
      const content = tr(n.contentKr, n.contentJp).toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [notices, query, tr]);

  const locale = lang === "JP" ? "ja" : "ko";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{tr("공지사항", "お知らせ")}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {tr(
                "서비스 변경, 점검, 정책 관련 공지를 확인합니다.",
                "サービス変更、メンテナンス、ポリシー関連のお知らせを確認します。",
              )}
            </p>
          </div>

          {/* ✅ 어드민만 작성 가능(데모: localStorage syncup_is_admin="true") */}
          {isAuthed && isAdmin ? (
            <Link
              href="/notices/new"
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
            >
              {tr("+ 공지 작성", "+ お知らせ作成")}
            </Link>
          ) : (
            <div className="shrink-0 text-xs text-gray-500">
              {tr("공지 작성은 어드민만 가능합니다.", "お知らせの作成は管理者のみ可能です。")}
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("검색: 제목, 내용", "検索: タイトル、内容")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            {tr("초기화", "リセット")}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8">
              <p className="text-sm text-gray-700">
                {tr("표시할 공지가 없습니다.", "表示するお知らせがありません。")}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {tr("검색어를 조정해 주세요.", "検索語を調整してください。")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((n) => (
                <li key={n.id} className="hover:bg-gray-50 transition">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {n.pinned ? (
                            <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                              {tr("고정", "固定")}
                            </span>
                          ) : null}
                          <span className="text-xs text-gray-500">{formatDate(n.createdAt, locale)}</span>
                        </div>

                        <p className="mt-2 text-base font-semibold text-gray-900 line-clamp-1">
                          {tr(n.titleKr, n.titleJp)}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {tr(n.contentKr, n.contentJp)}
                        </p>
                      </div>

                      {/* ✅ 공지사항은 댓글 기능 없음: 액션/카운트 표시 제거 */}
                      <div className="shrink-0 text-xs text-gray-400">•</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
