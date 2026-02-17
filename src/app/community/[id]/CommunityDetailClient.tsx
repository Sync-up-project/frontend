"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiGetCommunityPost,
  apiGetCommunityComments,
  apiPostCommunityComment,
} from "@/lib/api";

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
  titleJp?: string;
  content: string;
  contentJp?: string;
  createdAt: string;
  authorName: string;
  likes: number;
  views: number;
  commentsCount: number;
  tags: string[];
  attachments?: Attachment[];
};

type Comment = {
  id: string;
  authorName: string;
  createdAt: string;
  content: string;
};

function pickArray(obj: any): any[] {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.comments)) return obj.comments;
  if (Array.isArray(obj.data)) return obj.data;
  if (obj.result && Array.isArray(obj.result)) return obj.result;
  if (obj.result && Array.isArray(obj.result.items)) return obj.result.items;
  return [];
}

function normalizePost(raw: any): Post {
  return {
    id: String(raw?.id ?? raw?.postId ?? ""),
    category: (raw?.category ?? "free") as Category,
    title: String(raw?.title ?? ""),
    titleJp: raw?.titleJp ?? raw?.titleJa ?? raw?.titleJP,
    content: String(raw?.content ?? raw?.body ?? ""),
    contentJp: raw?.contentJp ?? raw?.contentJa ?? raw?.contentJP,
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? new Date().toISOString()),
    authorName: String(raw?.authorName ?? raw?.author?.nickname ?? raw?.author ?? ""),
    likes: Number(raw?.likes ?? raw?.likeCount ?? 0),
    views: Number(raw?.views ?? raw?.viewCount ?? 0),
    commentsCount: Number(raw?.commentsCount ?? raw?.commentCount ?? 0),
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    attachments: Array.isArray(raw?.attachments)
      ? raw.attachments.map((a: any) => ({
          name: String(a?.name ?? "file"),
          type: String(a?.type ?? "application/octet-stream"),
          size: Number(a?.size ?? 0),
        }))
      : [],
  };
}

function normalizeComment(raw: any): Comment {
  return {
    id: String(raw?.id ?? raw?.commentId ?? ""),
    authorName: String(raw?.authorName ?? raw?.author?.nickname ?? raw?.author ?? ""),
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? new Date().toISOString()),
    content: String(raw?.content ?? raw?.body ?? ""),
  };
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

function formatFullDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function Divider() {
  return <div className="h-px w-full bg-gray-100" />;
}

export default function CommunityDetailClient() {
  const params = useParams();
  const router = useRouter();
  const postId = String((params as any)?.id ?? "");

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");

  const [loadingPost, setLoadingPost] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const [errorPost, setErrorPost] = useState<string | null>(null);
  const [errorComments, setErrorComments] = useState<string | null>(null);

  // 상세 조회
  useEffect(() => {
    if (!postId) return;
    let mounted = true;
    (async () => {
      setLoadingPost(true);
      setErrorPost(null);
      try {
        const res = await apiGetCommunityPost(postId);
        const raw = res?.data && typeof res.data === "object" ? res.data : res;
        const normalized = normalizePost(raw);
        if (mounted) setPost(normalized);
      } catch (e: any) {
        if (mounted) setErrorPost(e?.message ?? "Failed to load post");
      } finally {
        if (mounted) setLoadingPost(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [postId]);

  // 댓글 조회
  useEffect(() => {
    if (!postId) return;
    let mounted = true;
    (async () => {
      setLoadingComments(true);
      setErrorComments(null);
      try {
        const res = await apiGetCommunityComments(postId);
        const list = pickArray(res).map(normalizeComment);

        // 최신순
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

        if (mounted) setComments(list);
      } catch (e: any) {
        if (mounted) setErrorComments(e?.message ?? "Failed to load comments");
      } finally {
        if (mounted) setLoadingComments(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [postId]);

  const attachments = useMemo(() => post?.attachments ?? [], [post]);
  const tags = useMemo(() => post?.tags ?? [], [post]);

  async function submitComment() {
    const content = commentDraft.trim();
    if (!content) return;

    setPostingComment(true);
    try {
      const res = await apiPostCommunityComment(postId, { content });
      const maybeRaw =
        res?.data && typeof res.data === "object" ? res.data : res;

      if (maybeRaw && (maybeRaw.id || maybeRaw.commentId)) {
        const created = normalizeComment(maybeRaw);
        setComments((prev) => [created, ...prev]);
      } else {
        //재조회
        const reload = await apiGetCommunityComments(postId);
        const list = pickArray(reload).map(normalizeComment);
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setComments(list);
      }

      // 댓글 수 반영
      setPost((prev) =>
        prev ? { ...prev, commentsCount: (prev.commentsCount ?? 0) + 1 } : prev,
      );

      setCommentDraft("");
    } catch (e: any) {
      alert(e?.message ?? "댓글 작성에 실패했습니다.");
    } finally {
      setPostingComment(false);
    }
  }

  // 좋아요
  function onLikeClick() {
    alert("좋아요 API가 준비되면 연동 예정입니다.");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            ← 뒤로
          </button>

          <Link
            href="/community"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            목록으로
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {loadingPost ? (
            <div className="p-8">
              <p className="text-sm text-gray-700">불러오는 중...</p>
            </div>
          ) : errorPost ? (
            <div className="p-8">
              <p className="text-sm text-red-600">게시글을 불러오지 못했습니다.</p>
              <p className="mt-2 text-xs text-gray-500 break-words">{errorPost}</p>
            </div>
          ) : !post || !post.id ? (
            <div className="p-8">
              <p className="text-sm text-gray-700">게시글이 존재하지 않습니다.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={categoryBadge(post.category)}>
                        {categoryLabel(post.category)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>

                    <h1 className="mt-3 text-xl font-semibold text-gray-900">
                      {post.title}
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">
                        {post.authorName}
                      </span>
                      <span>·</span>
                      <span>{formatFullDate(post.createdAt)}</span>
                      <span>·</span>
                      <span>조회 {post.views}</span>
                      <span>·</span>
                      <span>댓글 {post.commentsCount}</span>
                      <span>·</span>
                      <span>좋아요 {post.likes}</span>
                    </div>

                    {tags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
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

                  <button
                    type="button"
                    onClick={onLikeClick}
                    disabled
                    className="shrink-0 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
                    title="좋아요 API가 준비되면 연동 예정"
                  >
                    👍 좋아요
                  </button>
                </div>
              </div>

              <Divider />

              {/* Body */}
              <div className="p-6">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                    {post.content}
                  </p>
                </div>

                {attachments.length > 0 ? (
                  <>
                    <div className="mt-6">
                      <p className="text-sm font-semibold text-gray-900">
                        첨부파일
                      </p>
                      <div className="mt-3 space-y-2">
                        {attachments.map((a) => (
                          <div
                            key={`${a.name}-${a.size}`}
                            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                {a.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {a.type} · {Math.max(0, Math.floor(a.size / 1024))}KB
                              </p>
                            </div>
                            <button
                              type="button"
                              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400 cursor-not-allowed"
                              disabled
                              title="첨부파일 다운로드 API 연동 필요"
                            >
                              다운로드
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <Divider />

              {/* Comments */}
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    댓글 {comments.length}
                  </p>
                </div>

                {/* comment input */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="댓글을 입력하세요"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={submitComment}
                      disabled={postingComment || commentDraft.trim().length === 0}
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-semibold transition",
                        postingComment || commentDraft.trim().length === 0
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-gray-900 text-white hover:bg-gray-800",
                      ].join(" ")}
                    >
                      {postingComment ? "등록 중..." : "댓글 등록"}
                    </button>
                  </div>
                </div>

                {/* list */}
                <div className="mt-6">
                  {loadingComments ? (
                    <p className="text-sm text-gray-700">댓글 불러오는 중...</p>
                  ) : errorComments ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-sm text-red-600">
                        댓글을 불러오지 못했습니다.
                      </p>
                      <p className="mt-2 text-xs text-gray-500 break-words">
                        {errorComments}
                      </p>
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-gray-600">아직 댓글이 없습니다.</p>
                  ) : (
                    <ul className="space-y-3">
                      {comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-2xl border border-gray-200 bg-white p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {c.authorName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatRelativeTime(c.createdAt)}
                            </p>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                            {c.content}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
