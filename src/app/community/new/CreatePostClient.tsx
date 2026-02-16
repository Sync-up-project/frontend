"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type Category = "free" | "question" | "share" | "review";

type Post = {
  id: string;
  category: Category | "notice";
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  authorName: string;
  likes: number;
  commentsCount: number;
  pinned?: boolean;
};

const LOCAL_POSTS_KEY = "syncup_local_community_posts";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "question", label: "질문" },
  { key: "share", label: "정보 공유" },
  { key: "review", label: "후기" },
  { key: "free", label: "자유" },
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

type ImageItem = { id: string; file: File; url: string };
type FileItem = { id: string; file: File };

function Chip({
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
        "rounded-full px-3 py-1 text-xs font-semibold border transition",
        selected
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-900">{children}</p>;
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-gray-500">{children}</p>;
}

export default function CreatePostClient() {
  const [category, setCategory] = useState<Category | "">("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    const cOk = Boolean(category);
    const tOk = title.trim().length > 0;
    const bOk = content.trim().length > 0;
    return cOk && tOk && bOk;
  }, [category, title, content]);

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    setTags((prev) => [...prev, t].slice(0, 10));
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addTag(tagInput);
    setTagInput("");
  }

  function onPickImages(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: ImageItem[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) continue;
      next.push({ id: uid("img"), file: f, url: URL.createObjectURL(f) });
    }
    setImages((prev) => [...prev, ...next]);
  }

  function onPickFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: FileItem[] = [];
    for (const f of Array.from(list)) next.push({ id: uid("file"), file: f });
    setFiles((prev) => [...prev, ...next]);
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((p) => p.id !== id));
  }

  function prevent(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onDropImages(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    onPickImages(e.dataTransfer.files);
  }

  function onDropFiles(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    onPickFiles(e.dataTransfer.files);
  }

  function savePost(post: Post) {
    const current = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
    const next = [post, ...current];
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("local-community:changed"));
  }

  async function onSubmit() {
    if (!canSubmit) {
      setErrorMsg("필수 항목(카테고리, 제목, 본문)을 모두 입력해 주세요.");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const now = new Date().toISOString();

      const post: Post = {
        id: uid("post"),
        category: category as Category,
        title: title.trim(),
        content,
        tags,
        createdAt: now,
        authorName: "테스트유저",
        likes: 0,
        commentsCount: 0,
      };

      // 파일/이미지는 프론트 단계에서는 “UI 제공”까지만 안정적입니다.
      // 실제 저장은 백엔드 연동 시 업로드로 확장하세요.
      void images;
      void files;

      savePost(post);
      window.location.href = "/community";
    } catch (err: any) {
      setErrorMsg(err?.message ?? "등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">커뮤니티 글쓰기</h1>
            <p className="mt-1 text-sm text-gray-600">카테고리, 제목, 본문은 필수입니다.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/community"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </Link>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
              className={[
                "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                !canSubmit || submitting
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700",
              ].join(" ")}
            >
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left/Main */}
          <div className="lg:col-span-9 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4">
                  <FieldLabel>카테고리 (필수)</FieldLabel>
                  <HelpText>글 성격에 맞는 분류를 선택해 주세요.</HelpText>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">선택</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-8">
                  <FieldLabel>제목 (필수)</FieldLabel>
                  <HelpText>핵심이 보이도록 짧게 작성해 주세요.</HelpText>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: Next.js에서 로컬 상태를 목록에 반영하는 방법 질문드립니다."
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="lg:col-span-12">
                  <FieldLabel>태그 (선택, 최대 열 개)</FieldLabel>
                  <HelpText>Enter로 추가할 수 있습니다.</HelpText>

                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagKeyDown}
                    placeholder="예: React, TypeScript, 면접"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                  />

                  {tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => removeTag(t)}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                          title="클릭하면 삭제됩니다."
                        >
                          #{t} ×
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel>본문 (필수)</FieldLabel>
                  <HelpText>상황, 목표, 시도한 내용 등을 포함해 주세요.</HelpText>
                </div>
                <div className="text-xs text-gray-500">{content.length.toLocaleString()}자</div>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  "예시)\n- 상황:\n- 목표:\n- 시도한 내용:\n- 궁금한 점:\n- 참고 링크:"
                }
                className="mt-3 min-h-[360px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </section>

            {/* Attachments (UI only for now) */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel>이미지 첨부</FieldLabel>
                  <HelpText>드래그 앤 드롭 또는 버튼으로 이미지를 추가할 수 있습니다.</HelpText>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickImages(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    이미지 추가
                  </button>
                </div>
              </div>

              <div
                onDragEnter={prevent}
                onDragOver={prevent}
                onDrop={onDropImages}
                className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6"
              >
                {images.length === 0 ? (
                  <p className="text-sm text-gray-600">이 영역에 이미지를 드래그 앤 드롭해 주세요.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="relative overflow-hidden rounded-xl border border-gray-200 bg-white"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.file.name} className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/75 transition"
                        >
                          삭제
                        </button>
                        <div className="px-3 py-2">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                            {img.file.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel>파일 첨부</FieldLabel>
                  <HelpText>기획서, 로그, 참고 자료를 첨부할 수 있습니다.</HelpText>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    파일 추가
                  </button>
                </div>
              </div>

              <div
                onDragEnter={prevent}
                onDragOver={prevent}
                onDrop={onDropFiles}
                className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6"
              >
                {files.length === 0 ? (
                  <p className="text-sm text-gray-600">이 영역에 파일을 드래그 앤 드롭해 주세요.</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {f.file.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {(f.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(f.id)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="lg:col-span-3 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">작성 가이드</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
                <li>질문 글에는 상황, 목표, 시도한 내용을 포함해 주세요.</li>
                <li>정보 공유 글에는 출처를 명확히 작성해 주세요.</li>
                <li>개인정보(전화번호 등)는 본문에 기재하지 않는 것을 권장합니다.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">빠른 태그</p>
              <p className="mt-1 text-xs text-gray-500">클릭하면 태그가 추가됩니다.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["React", "TypeScript", "Next.js", "면접", "협업", "포트폴리오"].map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={tags.includes(t)}
                    onClick={() => addTag(t)}
                  />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
