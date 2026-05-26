"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { apiPostCommunityPost } from "@/lib/api";
import { fetchCurrentUser, getAccessToken, getCurrentUser, saveCurrentUser } from "@/lib/auth";

type Category = "free" | "question" | "share" | "review";

function isCategory(v: string | null): v is Category {
  return v === "free" || v === "question" || v === "share" || v === "review";
}

const CATEGORIES: { key: Category; labelKr: string; labelJp: string }[] = [
  { key: "free", labelKr: "자유", labelJp: "フリー" },
  { key: "question", labelKr: "QnA", labelJp: "QnA" },
  { key: "share", labelKr: "정보 공유", labelJp: "情報共有" },
  { key: "review", labelKr: "후기", labelJp: "レビュー" },
];

async function resolveAuthorId(): Promise<string | null> {
  const cached = getCurrentUser();
  if (cached?.id) return cached.id;

  try {
    const u = await fetchCurrentUser();
    if (u?.id) {
      saveCurrentUser(u);
      return u.id;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function CommunityWriteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tr, lang } = useI18n();

  // ✅ 비로그인 직접 접근 차단: 알림 → 로그인 이동
  useEffect(() => {
    if (!getAccessToken()) {
      alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
      router.replace("/login");
    }
  }, [router, tr]);

  const initialCategory = useMemo<Category>(() => {
    const q = searchParams.get("category");
    return isCategory(q) ? q : "free";
  }, [searchParams]);

  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const tags = useMemo(() => {
    const raw = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return Array.from(new Set(raw)).slice(0, 10);
  }, [tagsInput]);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;

    // ✅ 클릭 시점에도 방어 (토큰이 중간에 사라졌을 수도 있으니)
    if (!getAccessToken()) {
      alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
      router.replace("/login");
      return;
    }

    setSubmitting(true);
    try {
      const authorId = await resolveAuthorId();
      if (!authorId) {
        alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
        router.replace("/login");
        return;
      }

      // i18n.tsx는 KR/JP로 운영되는 구조라서, 백엔드 Language enum에 맞춰 KO/JA로 변환
      const originalLang = lang === "JP" ? "JA" : "KO";

      const res = await apiPostCommunityPost({
        authorId,
        category,
        title: title.trim(),
        content: content.trim(),
        tags,
        originalLang,
      });

      const raw =
        (res as any)?.data && typeof (res as any).data === "object" ? (res as any).data : res;
      const id = (raw as any)?.id ?? (raw as any)?.postId;

      if (id) router.push(`/community/${id}`);
      else router.push(`/community?tab=${category}`);
    } catch (e: any) {
      alert(e?.message ?? tr("게시글 작성에 실패했습니다.", "投稿に失敗しました。"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-transparent">
      <div className="mx-auto w-full max-w-[960px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{tr("글쓰기", "投稿")}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {tr("카테고리를 선택하고 글을 작성하세요.", "カテゴリを選んで投稿してください。")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/community?tab=${category}`}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {tr("목록", "一覧")}
            </Link>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={[
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                canSubmit ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-300 cursor-not-allowed",
              ].join(" ")}
            >
              {submitting ? tr("저장 중...", "保存中...") : tr("등록", "投稿")}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <label className="block text-sm font-semibold text-gray-900">{tr("카테고리", "カテゴリ")}</label>

          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-semibold border transition",
                  category === c.key
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                {tr(c.labelKr, c.labelJp)}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-900">{tr("제목", "タイトル")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder={tr("제목을 입력하세요", "タイトルを入力してください")}
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-900">{tr("내용", "内容")}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-2 h-[280px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder={tr("내용을 입력하세요", "内容を入力してください")}
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-900">{tr("태그(쉼표로 구분)", "タグ(カンマ区切り)")}</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder={tr("예: Next.js, NestJS, Prisma", "例: Next.js, NestJS, Prisma")}
            />
            {tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={[
                "rounded-xl px-5 py-3 text-sm font-semibold text-white",
                canSubmit ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-300 cursor-not-allowed",
              ].join(" ")}
            >
              {submitting ? tr("저장 중...", "保存中...") : tr("등록", "投稿")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
