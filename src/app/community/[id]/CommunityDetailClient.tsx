"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Category = "free" | "question" | "share" | "review";

type Attachment = {
  name: string;
  type: string;
  size: number;
};

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
  attachments?: Attachment[];
};

type Comment = {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string; // ISO
};

const LOCAL_POSTS_KEY = "syncup_local_community_posts";
const COMMENTS_KEY = "syncup_local_community_comments";

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

function formatRelativeTime(iso: string) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);

  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function categoryLabel(category: Category) {
  switch (category) {
    case "question":
      return "QnA";
    case "share":
      return "정보 공유";
    case "review":
      return "후기";
    case "free":
    default:
      return "자유";
  }
}

function categoryBadgeClass(category: Category) {
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  const kb = Math.round(size / 1024);
  if (kb < 1024) return `${kb} KB`;
  const mb = (size / 1024 / 1024).toFixed(1);
  return `${mb} MB`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-900">{children}</p>;
}

export default function CommunityDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const postId = params?.id ?? "";

  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  // post + comments load
  useEffect(() => {
    if (!postId) return;

    const storedPosts = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
    const found = storedPosts.find((p) => p.id === postId);

    if (!found) {
      setNotFound(true);
      setPost(null);
      setComments([]);
      return;
    }

    setNotFound(false);
    setPost(found);

    const storedComments = safeParseJson<Comment[]>(localStorage.getItem(COMMENTS_KEY), []);
    const postComments = storedComments
      .filter((c) => c.postId === postId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    setComments(postComments);
  }, [postId]);

  const backHref = useMemo(() => {
    if (!post) return "/community";
    return `/community?tab=${post.category}`;
  }, [post]);

  function persistPost(updated: Post) {
    const stored = safeParseJson<Post[]>(localStorage.getItem(LOCAL_POSTS_KEY), []);
    const next = stored.map((p) => (p.id === updated.id ? updated : p));
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(next));
    setPost(updated);

    // 목록 갱신 이벤트
    window.dispatchEvent(new Event("local-community:changed"));
  }

  function handleLike() {
    if (!post) return;
    const updated: Post = { ...post, likes: post.likes + 1 };
    persistPost(updated);
  }

  function persistComments(nextCommentsAll: Comment[]) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(nextCommentsAll));

    // post commentsCount 동기화
    if (post) {
      const count = nextCommentsAll.filter((c) => c.postId === post.id).length;
      const updated: Post = { ...post, commentsCount: count };
      persistPost(updated);
    }
  }

  function addComment() {
    if (!post) return;

    const content = commentText.trim();
    if (!content) {
      setCommentError("댓글 내용을 입력해 주세요.");
      return;
    }
    if (content.length > 300) {
      setCommentError("댓글은 300자 이내로 입력해 주세요.");
      return;
    }

    setCommentError(null);

    const newComment: Comment = {
      id: uid("cm"),
      postId: post.id,
      authorName: "테스트유저",
      content,
      createdAt: new Date().toISOString(),
    };

    const all = safeParseJson<Comment[]>(localStorage.getItem(COMMENTS_KEY), []);
    const nextAll = [newComment, ...all];
    persistComments(nextAll);

    // 현재 화면용 state 갱신
    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <h1 className="text-lg font-semibold text-gray-900">게시글을 찾을 수 없습니다.</h1>
            <p className="mt-2 text-sm text-gray-600">
              삭제되었거나, 잘못된 주소일 수 있습니다.
            </p>

            <div className="mt-6">
              <Link
                href="/community"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                커뮤니티로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <p className="text-sm text-gray-600">불러오는 중입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={categoryBadgeClass(post.category)}>{categoryLabel(post.category)}</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-500">{formatRelativeTime(post.createdAt)}</span>
            </div>

            <h1 className="mt-2 text-xl font-semibold text-gray-900 break-words">{post.title}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>작성자 {post.authorName}</span>
              <span>·</span>
              <span>댓글 {post.commentsCount}</span>
              <span>·</span>
              <span>좋아요 {post.likes}</span>
            </div>

            {post.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((t) => (
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

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={backHref}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              목록으로
            </Link>

            <button
              type="button"
              onClick={handleLike}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              좋아요
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Content */}
          <main className="lg:col-span-9 min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <SectionTitle>본문</SectionTitle>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-800">
                {post.content}
              </div>
            </div>

            {/* Attachments */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <SectionTitle>첨부</SectionTitle>
              {post.attachments && post.attachments.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {post.attachments.map((a, idx) => (
                    <li
                      key={`${a.name}_${idx}`}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{a.name}</p>
                        <p className="mt-1 text-xs text-gray-500 truncate">
                          {a.type || "unknown"} · {formatFileSize(a.size)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">파일</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-600">첨부된 파일이 없습니다.</p>
              )}
              <p className="mt-3 text-xs text-gray-500">
                현재 단계에서는 파일 자체를 업로드하지 않고, 파일 정보만 표시합니다.
              </p>
            </div>

            {/* Comments */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <SectionTitle>댓글</SectionTitle>
                <span className="text-xs text-gray-500">{comments.length}개</span>
              </div>

              {/* Add comment */}
              <div className="mt-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글을 입력해 주세요."
                  className="min-h-[100px] w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />

                {commentError ? (
                  <p className="mt-2 text-sm font-semibold text-red-700">{commentError}</p>
                ) : null}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCommentText("");
                      setCommentError(null);
                    }}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    onClick={addComment}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    댓글 등록
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="mt-6 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-600">첫 댓글을 남겨 주세요.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">{c.authorName}</p>
                        <p className="text-xs text-gray-500">{formatRelativeTime(c.createdAt)}</p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>

          {/* Side */}
          <aside className="lg:col-span-3 lg:sticky lg:top-[92px] h-fit space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <SectionTitle>바로가기</SectionTitle>
              <div className="mt-4 space-y-2">
                <Link
                  href={backHref}
                  className="block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  같은 탭 목록으로
                </Link>

                <button
                  type="button"
                  onClick={() => router.push(`/community/new?category=${post.category}`)}
                  className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  같은 카테고리로 글쓰기
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <SectionTitle>현재 글 정보</SectionTitle>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>카테고리: {categoryLabel(post.category)}</p>
                <p>작성자: {post.authorName}</p>
                <p>좋아요: {post.likes}</p>
                <p>댓글: {post.commentsCount}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
