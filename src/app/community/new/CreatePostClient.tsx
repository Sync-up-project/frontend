"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiPostCommunityPost } from "@/lib/api";

type Category = "free" | "question" | "share" | "review";

function isCategory(v: string | null): v is Category {
  return v === "free" || v === "question" || v === "share" || v === "review";
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "free", label: "자유" },
  { key: "question", label: "QnA" },
  { key: "share", label: "정보 공유" },
  { key: "review", label: "후기" },
];

export default function CreatePostClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = useMemo<Category>(() => {
    const q = searchParams.get("category");
    return isCategory(q) ? q : "free";
  }, [searchParams]);

  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tags = useMemo(() => {
    const raw = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return Array.from(new Set(raw)).slice(0, 10);
  }, [tagsInput]);

  const canSubmit =
    title.trim().length > 0 && content.trim().length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await apiPostCommunityPost({
        category,
        title: title.trim(),
        content: content.trim(),
        tags,
      });

      const raw = res?.data && typeof res.data === "object" ? res.data : res;
      const id = raw?.id ?? raw?.postId;

      if (id) router.push(`/community/${id}`);
      else router.push(`/community?tab=${category}`);
    } catch (e: any) {
      alert(e?.message ?? "게시글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[960px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">글쓰기</h1>
            <p className="mt-1 text-sm text-gray-600">
              간단 작성 컴포넌트입니다. (API 연동 통일)
            </p>
          </div>

          <Link
            href={`/community?tab=${category}`}
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            목록으로
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Category */}
            <div>
              <p className="text-sm font-semibold text-gray-900">카테고리</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const selected = category === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-semibold border transition",
                        selected
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <p className="text-sm font-semibold text-gray-900">제목</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Content */}
            <div>
              <p className="text-sm font-semibold text-gray-900">본문</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                rows={10}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Tags */}
            <div>
              <p className="text-sm font-semibold text-gray-900">태그</p>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="예: nextjs, prisma (쉼표로 구분)"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
              />
              {tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white p-6">
            <Link
              href={`/community?tab=${category}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </Link>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                canSubmit
                  ? "bg-gray-900 text-white hover:bg-gray-800"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed",
              ].join(" ")}
            >
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
