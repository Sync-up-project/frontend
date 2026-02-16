"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

type Category = "free" | "question" | "share" | "review";

type Post = {
  id: string;
  category: Category;
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO
  authorName: string;
  likes: number;
  commentsCount: number;
  attachments?: { name: string; type: string; size: number }[];
};

const LOCAL_POSTS_KEY = "syncup_local_community_posts";

const CATEGORIES: { key: Category; label: string; helper: string }[] = [
  { key: "free", label: "자유", helper: "잡담, 고민, 회고 등 자유로운 주제" },
  { key: "question", label: "QnA", helper: "기술 질문, 구현 이슈, 설계 고민" },
  { key: "share", label: "정보 공유", helper: "자료, 템플릿, 레퍼런스, 팁 공유" },
  { key: "review", label: "후기", helper: "프로젝트/학습/취업 준비 등 회고" },
];

function isCategory(v: string | null): v is Category {
  return v === "free" || v === "question" || v === "share" || v === "review";
}

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

function splitTags(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export default function CommunityWriteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = useMemo<Category>(() => {
    const c = searchParams.get("category");
    return isCategory(c) ? c : "free";
  }, [searchParams]);

  const [category, setCategory] = useState<Category>(initialCategory);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 쿼리가 바뀌면 카테고리도 그에 맞춰 갱신
    setCategory(initialCategory);
  }, [initialCategory]);

  const categoryHelper = useMemo(() => {
    return CATEGORIES.find((c) => c.key === category)?.helper ?? "";
  }, [category]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
  }

  function validate() {
    const t = title.trim();
    const c = content.trim();

    if (!t) return "제목을 입력해 주세요.";
    if (!c) return "본문을 입력해 주세요.";
    if (t.length > 80) return "제목은 80자 이내로 입력해 주세요.";
    return null;
  }

  function savePost() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const user = getCurrentUser();
    const authorName = user?.nickname ?? "게스트";

    const newPost: Post = {
      id: uid("c"),
      category,
      title: title.trim(),
      content: content.trim(),
      tags: splitTags(tagsInput),
      createdAt: new Date().toISOString(),
      authorName,
      likes: 0,
      commentsCount: 0,
      attachments: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    };

    const current = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
    const next = [newPost, ...current];
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(next));

    // 목록 갱신 이벤트
    window.dispatchEvent(new Event("local-community:changed"));

    // ✅ 작성한 카테고리 탭으로 복귀
    router.push(`/community?tab=${category}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">글쓰기</h1>
            <p className="mt-1 text-sm text-gray-600">카테고리, 제목, 본문은 필수 항목입니다.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/community?tab=${category}`)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={savePost}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              등록
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Editor */}
          <main className="lg:col-span-9">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              {/* Category */}
              <div className="flex items-center justify-between gap-4">
                <div className="w-full">
                  <label className="block text-sm font-semibold text-gray-900">카테고리</label>
                  <p className="mt-1 text-xs text-gray-500">{categoryHelper}</p>
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-900">제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력해 주세요."
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-2 text-xs text-gray-500">최대 80자.</p>
              </div>

              {/* Tags */}
              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-900">태그</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder='예: React, TypeScript, 협업 (쉼표로 구분)'
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-2 text-xs text-gray-500">쉼표로 구분하며, 최대 10개까지 저장됩니다.</p>
              </div>

              {/* Content */}
              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-900">본문</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="내용을 입력해 주세요."
                  className="mt-2 min-h-[320px] w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Attachments */}
              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-900">첨부</label>
                <input
                  type="file"
                  multiple
                  onChange={onPickFiles}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
                />
                <p className="mt-2 text-xs text-gray-500">
                  현재는 프론트 더미 저장이므로 파일 자체는 저장하지 않고, 파일 정보만 기록합니다.
                </p>

                {files.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {files.map((f) => (
                      <li
                        key={`${f.name}_${f.size}_${f.lastModified}`}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <span className="text-sm text-gray-900">{f.name}</span>
                        <span className="text-xs text-gray-500">{Math.round(f.size / 1024)} KB</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {error ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              ) : null}
            </div>
          </main>

          {/* Side helper */}
          <aside className="lg:col-span-3 lg:sticky lg:top-[92px] h-fit space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold text-gray-900">작성 가이드</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>• QnA: 문제 상황, 기대 결과, 시도한 방법을 함께 적어 주세요.</li>
                <li>• 정보 공유: 링크/요약/적용 방법을 짧게라도 포함해 주세요.</li>
                <li>• 후기: 배운 점, 다음 개선점을 한 줄이라도 남기면 좋습니다.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
