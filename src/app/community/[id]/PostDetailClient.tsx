"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Post = {
  id: string;
  category: "free" | "question" | "share" | "review" | "notice";
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  authorName: string;
  likes: number;
  commentsCount: number;
  pinned?: boolean;
};

type Comment = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

const LOCAL_POSTS_KEY = "syncup_local_community_posts";

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function categoryBadge(category: Post["category"]) {
  const base = "inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold";
  switch (category) {
    case "notice":
      return `${base} bg-gray-900 text-white`;
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

export default function PostDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [tick, setTick] = useState(0);
  const [commentInput, setCommentInput] = useState("");

  const commentKey = useMemo(() => `syncup_local_community_comments_${id}`, [id]);

  const post = useMemo(() => {
    if (!id) return null;
    const list = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
    return list.find((p) => p.id === id) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tick]);

  const comments = useMemo(() => {
    if (!id) return [];
    return safeParseJson<Comment[]>(localStorage.getItem(commentKey), []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tick]);

  function persistPost(update: (p: Post) => Post) {
    if (!id) return;
    const list = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
    const next = list.map((p) => (p.id === id ? update(p) : p));
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("local-community:changed"));
    setTick((v) => v + 1);
  }

  function onLike() {
    if (!post) return;
    persistPost((p) => ({ ...p, likes: p.likes + 1 }));
  }

  function onAddComment() {
    if (!id) return;
    const t = commentInput.trim();
    if (!t) return;

    const nextComment: Comment = {
      id: uid("cm"),
      authorName: "테스트유저",
      content: t,
      createdAt: new Date().toISOString(),
    };

    const current = safeParseJson<Comment[]>(localStorage.getItem(commentKey), []);
    const next = [...current, nextComment];
    localStorage.setItem(commentKey, JSON.stringify(next));

    persistPost((p) => ({ ...p, commentsCount: p.commentsCount + 1 }));
    setCommentInput("");
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-10">
          <p className="text-sm text-gray-700">게시글을 찾을 수 없습니다.</p>
          <Link
            href="/community"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            커뮤니티로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/community"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            ← 목록
          </Link>

          <button
            type="button"
            onClick={onLike}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            좋아요 {post.likes}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="lg:col-span-9 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <span className={categoryBadge(post.category)}>{post.category}</span>
                {post.category === "notice" && post.pinned ? (
                  <span className="text-xs font-semibold text-gray-700">고정</span>
                ) : null}
              </div>

              <h1 className="mt-3 text-xl font-bold text-gray-900">{post.title}</h1>

              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span>{post.authorName}</span>
                <span>·</span>
                <span>{formatTime(post.createdAt)}</span>
                <span>·</span>
                <span>댓글 {post.commentsCount}</span>
              </div>

              {post.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 whitespace-pre-wrap text-sm text-gray-800 leading-6">
                {post.content}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">댓글</p>

              <div className="mt-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-600">아직 댓글이 없습니다.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{c.authorName}</span>
                        <span>{formatTime(c.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="댓글을 입력해 주세요."
                  className="w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={onAddComment}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    댓글 등록
                  </button>
                </div>
              </div>
            </section>
          </main>

          <aside className="lg:col-span-3 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-sm font-semibold text-gray-900">안내</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-2">
                <li>개인정보는 본문에 기재하지 않는 것을 권장합니다.</li>
                <li>정보 공유 글에는 출처를 함께 남겨 주세요.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
