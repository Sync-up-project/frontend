"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";

type Category = "free" | "question" | "share" | "review";
type SortKey = "latest" | "popular" | "commented";

type Post = {
  id: string;
  category: Category;
  title: string;
  titleJp?: string;
  content: string;
  contentJp?: string;
  tags: string[];
  createdAt: string; // ISO
  authorName: string; // ✅ 고유값(닉네임)은 번역하지 않음
  likes: number;
  commentsCount: number;
};

const LOCAL_POSTS_KEY = "syncup_local_community_posts";

const TABS: { key: Category; labelKr: string; labelJp: string }[] = [
  { key: "free", labelKr: "자유", labelJp: "フリー" },
  { key: "question", labelKr: "QnA", labelJp: "QnA" },
  { key: "share", labelKr: "정보 공유", labelJp: "情報共有" },
  { key: "review", labelKr: "후기", labelJp: "レビュー" },
];

const SORTS: { key: SortKey; labelKr: string; labelJp: string }[] = [
  { key: "latest", labelKr: "최신순", labelJp: "新着順" },
  { key: "popular", labelKr: "인기순", labelJp: "人気順" },
  { key: "commented", labelKr: "댓글순", labelJp: "コメント順" },
];

function uid(prefix = "id") {
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

function isCategory(v: string | null): v is Category {
  return v === "free" || v === "question" || v === "share" || v === "review";
}

function categoryBadge(category: Category) {
  const base = "inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold";
  switch (category) {
    case "question":
      return `${base} bg-blue-100 text-blue-700`;
    case "share":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "review":
      return `${base} bg-amber-100 text-amber-700`;
    case "free":
    default:
      return `${base} bg-gray-100 text-gray-700`;
  }
}

function TabButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm font-semibold border transition",
        selected
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-900">{children}</p>;
}

export default function CommunityClient() {
  const { tr } = useI18n();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Category>("free");
  const [posts, setPosts] = useState<Post[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [query, setQuery] = useState("");

  function categoryLabel(category: Category) {
    switch (category) {
      case "question":
        return tr("QnA", "QnA");
      case "share":
        return tr("정보 공유", "情報共有");
      case "review":
        return tr("후기", "レビュー");
      case "free":
      default:
        return tr("자유", "フリー");
    }
  }

  function excerpt(content: string) {
    const t = content.replace(/\s+/g, " ").trim();
    if (!t) return tr("내용이 없습니다.", "内容がありません。");
    return t.length > 90 ? `${t.slice(0, 90)}…` : t;
  }

  function formatRelativeTime(iso: string) {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - d);

    const min = Math.floor(diff / 60000);
    if (min < 1) return tr("방금 전", "たった今");
    if (min < 60) return tr(`${min}분 전`, `${min}分前`);

    const hr = Math.floor(min / 60);
    if (hr < 24) return tr(`${hr}시간 전`, `${hr}時間前`);

    const day = Math.floor(hr / 24);
    return tr(`${day}일 전`, `${day}日前`);
  }

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (isCategory(tabParam)) setTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    const sync = () => {
      const stored = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
      setPosts(stored);
    };

    const seedIfEmpty = () => {
      const current = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
      if (current.length > 0) return;

      const now = Date.now();
      const mkTime = (minutesAgo: number) => new Date(now - 1000 * 60 * minutesAgo).toISOString();

      const seeded: Post[] = [
        // 자유 3
        {
          id: uid("c"),
          category: "free",
          title: "커뮤니티 첫 글입니다.",
          titleJp: "コミュニティの最初の投稿です。",
          content: "가벼운 이야기부터 시작해도 괜찮습니다.",
          contentJp: "気軽な話題から始めても大丈夫です。",
          tags: ["커뮤니티"],
          createdAt: mkTime(10),
          authorName: "테스트유저",
          likes: 2,
          commentsCount: 0,
        },
        {
          id: uid("c"),
          category: "free",
          title: "팀 프로젝트 하면서 제일 힘든 점이 무엇인가요?",
          titleJp: "チーム開発で一番大変だったことは何ですか？",
          content: "일정, 역할, 커뮤니케이션 중에서 경험을 공유해 주세요.",
          contentJp: "スケジュール、役割、コミュニケーションなど、経験を共有してください。",
          tags: ["협업"],
          createdAt: mkTime(80),
          authorName: "테스트유저",
          likes: 1,
          commentsCount: 0,
        },
        {
          id: uid("c"),
          category: "free",
          title: "오늘 작업 목표 공유합니다.",
          titleJp: "今日の作業目標を共有します。",
          content: "프로젝트 목록 UI 정리하고, 커뮤니티 글쓰기까지 연결하려고 합니다.",
          contentJp: "プロジェクト一覧UIを整えて、コミュニティ投稿までつなげます。",
          tags: ["회고"],
          createdAt: mkTime(240),
          authorName: "테스트유저",
          likes: 0,
          commentsCount: 0,
        },

        // QnA 3
        {
          id: uid("c"),
          category: "question",
          title: "Next.js에서 localStorage 기반 목록 갱신은 어떻게 처리하시나요?",
          titleJp: "Next.jsでlocalStorageベースの一覧更新はどう処理していますか？",
          content: "작성 후 목록으로 돌아오면 새 글이 즉시 보이게 만들고 싶습니다.",
          contentJp: "投稿後に一覧へ戻ったとき、新しい投稿がすぐ見えるようにしたいです。",
          tags: ["Next.js"],
          createdAt: mkTime(35),
          authorName: "테스트유저",
          likes: 3,
          commentsCount: 1,
        },
        {
          id: uid("c"),
          category: "question",
          title: "Tailwind spacing 기준을 통일하는 팁이 있을까요?",
          titleJp: "Tailwindのspacing基準を統一するコツはありますか？",
          content: "컴포넌트마다 padding, gap이 달라져서 정리가 어렵습니다.",
          contentJp: "コンポーネントごとにpaddingやgapが違って整理が難しいです。",
          tags: ["Tailwind"],
          createdAt: mkTime(300),
          authorName: "테스트유저",
          likes: 1,
          commentsCount: 0,
        },
        {
          id: uid("c"),
          category: "question",
          title: "필터 상태를 URL 쿼리로 동기화하는 편이 좋을까요?",
          titleJp: "フィルター状態をURLクエリと同期したほうが良いですか？",
          content: "공유/새로고침 관점에서 URL 동기화를 고민 중입니다.",
          contentJp: "共有やリロードの観点でURL同期を検討中です。",
          tags: ["UX"],
          createdAt: mkTime(540),
          authorName: "테스트유저",
          likes: 0,
          commentsCount: 0,
        },

        // 정보 공유 3
        {
          id: uid("c"),
          category: "share",
          title: "간단한 협업 체크리스트 공유합니다.",
          titleJp: "簡単な協業チェックリストを共有します。",
          content: "요구사항, API, 화면 흐름, 테스트 항목을 짧게라도 정리해 두면 편합니다.",
          contentJp: "要件、API、画面フロー、テスト項目を短くても整理しておくと便利です。",
          tags: ["문서화"],
          createdAt: mkTime(60),
          authorName: "테스트유저",
          likes: 4,
          commentsCount: 0,
        },
        {
          id: uid("c"),
          category: "share",
          title: "PR 리뷰 시 최소 확인 항목을 정리해 봤습니다.",
          titleJp: "PRレビューで最低限見る項目をまとめました。",
          content: "동작 확인, 예외 케이스, 네이밍, 타입 정도만 고정해도 품질이 올라갑니다.",
          contentJp: "動作確認、例外ケース、命名、型だけでも固定すると品質が上がります。",
          tags: ["코드리뷰"],
          createdAt: mkTime(420),
          authorName: "테스트유저",
          likes: 2,
          commentsCount: 0,
        },
        {
          id: uid("c"),
          category: "share",
          title: "프로젝트 소개 글 템플릿(짧은 버전)",
          titleJp: "プロジェクト紹介テンプレ（短縮版）",
          content: "목표, 핵심 기능, 역할, 기술 스택, 회고 포인트만 적어도 충분합니다.",
          contentJp: "目標、主要機能、役割、技術、振り返りポイントだけでも十分です。",
          tags: ["포트폴리오"],
          createdAt: mkTime(700),
          authorName: "테스트유저",
          likes: 1,
          commentsCount: 0,
        },

        // 후기 3
        {
          id: uid("c"),
          category: "review",
          title: "첫 팀 프로젝트 회고",
          titleJp: "初めてのチーム開発の振り返り",
          content: "기능 욕심을 줄이고 마감 기준을 먼저 정하니 훨씬 안정적이었습니다.",
          contentJp: "欲張らず、締切基準を先に決めたら安定しました。",
          tags: ["회고"],
          createdAt: mkTime(90),
          authorName: "테스트유저",
          likes: 3,
          commentsCount: 2,
        },
        {
          id: uid("c"),
          category: "review",
          title: "UI 정리 후기",
          titleJp: "UI整理の感想",
          content: "spacing, radius 기준을 고정하고 컴포넌트를 맞추니 속도가 빨라졌습니다.",
          contentJp: "spacingとradiusを固定して揃えると、作業が速くなりました。",
          tags: ["UI/UX"],
          createdAt: mkTime(520),
          authorName: "테스트유저",
          likes: 1,
          commentsCount: 0,
        },
        {
          id: uid("c"),
          category: "review",
          title: "탭 분리 적용 후기",
          titleJp: "タブ分離を適用した感想",
          content: "질문과 정보가 섞이지 않아서 탐색 피로도가 확실히 줄었습니다.",
          contentJp: "質問と情報が混ざらず、探索の疲労が減りました。",
          tags: ["IA"],
          createdAt: mkTime(900),
          authorName: "테스트유저",
          likes: 0,
          commentsCount: 0,
        },
      ];

      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(seeded));
    };

    seedIfEmpty();
    sync();

    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_POSTS_KEY) sync();
    };
    const onChanged = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("local-community:changed", onChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("local-community:changed", onChanged);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = posts.filter((p) => p.category === tab);

    const searched =
      q.length === 0
        ? base
        : base.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.content.toLowerCase().includes(q) ||
              p.authorName.toLowerCase().includes(q) ||
              p.tags.some((t) => t.toLowerCase().includes(q)),
          );

    const sortFn = (a: Post, b: Post) => {
      if (sortKey === "popular") return (b.likes - a.likes) || (a.createdAt < b.createdAt ? 1 : -1);
      if (sortKey === "commented")
        return (b.commentsCount - a.commentsCount) || (a.createdAt < b.createdAt ? 1 : -1);
      return a.createdAt < b.createdAt ? 1 : -1;
    };

    return [...searched].sort(sortFn);
  }, [posts, tab, query, sortKey]);

  const trending = useMemo(() => {
    return [...posts]
      .sort((a, b) => b.likes + b.commentsCount * 2 - (a.likes + a.commentsCount * 2))
      .slice(0, 6);
  }, [posts]);

  function resetSearch() {
    setQuery("");
    setSortKey("latest");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="min-w-0 lg:col-span-10">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {tr("커뮤니티", "コミュニティ")}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {tr(
                    "탭을 선택해 목적에 맞는 글만 확인할 수 있습니다.",
                    "タブを選んで目的に合う投稿だけ確認できます。",
                  )}
                </p>
              </div>

              <Link
                href={`/community/new?category=${tab}`}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
              >
                {tr("+ 글쓰기", "+ 投稿する")}
              </Link>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {TABS.map((t) => (
                <TabButton
                  key={t.key}
                  label={tr(t.labelKr, t.labelJp)}
                  selected={tab === t.key}
                  onClick={() => {
                    setTab(t.key);
                    resetSearch();
                  }}
                />
              ))}
            </div>

            {/* Search + Sort */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tr("검색: 제목, 본문, 태그, 작성자", "検索: タイトル、本文、タグ、作成者")}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-[140px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {tr(s.labelKr, s.labelJp)}
                  </option>
                ))}
              </select>
            </div>

            {/* List */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-8">
                  <p className="text-sm text-gray-700">
                    {tr("조건에 맞는 게시글이 없습니다.", "条件に合う投稿がありません。")}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {tr("탭을 변경하거나 검색어를 조정해 주세요.", "タブを変更するか検索語を調整してください。")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((p) => {
                    const title = tr(p.title, p.titleJp ?? p.title);
                    const content = tr(p.content, p.contentJp ?? p.content);

                    return (
                      <li key={p.id} className="hover:bg-gray-50 transition">
                        <Link href={`/community/${p.id}`} className="block p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={categoryBadge(p.category)}>{categoryLabel(p.category)}</span>
                              </div>

                              <p className="mt-2 text-base font-semibold text-gray-900 line-clamp-1">
                                {title}
                              </p>
                              <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                                {excerpt(content)}
                              </p>

                              {p.tags.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {p.tags.slice(0, 3).map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {p.tags.length > 3 ? (
                                    <span className="text-xs font-semibold text-gray-500">
                                      +{p.tags.length - 3}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                                <span>{p.authorName}</span>
                                <span>·</span>
                                <span>{formatRelativeTime(p.createdAt)}</span>
                                <span>·</span>
                                <span>{tr(`댓글 ${p.commentsCount}`, `コメント ${p.commentsCount}`)}</span>
                                <span>·</span>
                                <span>{tr(`좋아요 ${p.likes}`, `いいね ${p.likes}`)}</span>
                              </div>
                            </div>

                            <div className="shrink-0 text-xs text-gray-400">→</div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </main>

          <aside className="lg:col-span-2 lg:sticky lg:top-[92px] h-fit space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <SectionTitle>{tr("인기글", "人気投稿")}</SectionTitle>
              <p className="mt-1 text-xs text-gray-500">
                {tr("좋아요와 댓글을 기준으로 정렬됩니다.", "いいねとコメントを基準に並び替えます。")}
              </p>

              <div className="mt-4 space-y-3">
                {trending.length === 0 ? (
                  <p className="text-sm text-gray-600">{tr("표시할 글이 없습니다.", "表示する投稿がありません。")}</p>
                ) : (
                  trending.map((t) => {
                    const title = tr(t.title, t.titleJp ?? t.title);
                    return (
                      <Link
                        key={t.id}
                        href={`/community/${t.id}`}
                        className="block rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 transition"
                      >
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{title}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span>{categoryLabel(t.category)}</span>
                          <span>·</span>
                          <span>{tr(`좋아요 ${t.likes}`, `いいね ${t.likes}`)}</span>
                          <span>·</span>
                          <span>{tr(`댓글 ${t.commentsCount}`, `コメント ${t.commentsCount}`)}</span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
