"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, MessageSquareText, ThumbsUp } from "lucide-react";

import {
  apiGetCommunityPost,
  apiPostCommunityComment,
  apiToggleCommunityPostLike,
  apiToUiPostCategory,
} from "@/lib/api";
import { fetchCurrentUser, getCurrentUser, saveCurrentUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type Category = "free" | "question" | "share" | "review";

type Post = {
  id: string;
  category: Category;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  authorName: string;
  authorEmail?: string;
  views: number;
  likes: number;
  commentsCount: number;
  tags: string[];
};

type Comment = {
  id: string;
  authorName: string;
  createdAt: string;
  content: string;
  replies: Comment[];
};

async function resolveUserId(): Promise<string | null> {
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

function formatFull(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(
    2,
    "0",
  )} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;

  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function categoryBadge(cat: Category) {
  const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold";
  switch (cat) {
    case "question":
      return `${base} border-blue-200 bg-blue-50 text-blue-700`;
    case "share":
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
    case "review":
      return `${base} border-amber-200 bg-amber-50 text-amber-700`;
    case "free":
    default:
      return `${base} border-gray-200 bg-gray-50 text-gray-700`;
  }
}

function categoryTextKR(cat: Category) {
  switch (cat) {
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

function categoryTextJP(cat: Category) {
  switch (cat) {
    case "question":
      return "QnA";
    case "share":
      return "情報共有";
    case "review":
      return "レビュー";
    case "free":
    default:
      return "フリー";
  }
}

function normalizePost(raw: any): Post {
  const category = apiToUiPostCategory(raw?.category) as Category;

  const title = raw?.titleOriginal ?? raw?.title ?? raw?.i18n?.[0]?.title ?? "";
  const content = raw?.contentOriginal ?? raw?.content ?? raw?.i18n?.[0]?.content ?? "";

  return {
    id: String(raw?.id ?? ""),
    category,
    title: String(title),
    content: String(content),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
    authorName: String(raw?.author?.nickname ?? raw?.authorNickname ?? raw?.authorName ?? "익명"),
    authorEmail: raw?.author?.email ? String(raw.author.email) : undefined,
    views: Number(raw?.viewCount ?? 0),
    likes: Number(raw?.likeCount ?? raw?._count?.likes ?? 0),
    commentsCount: Number(raw?.commentCount ?? raw?._count?.comments ?? 0),
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
  };
}

function normalizeComment(raw: any): Comment {
  const content =
    raw?.contentOriginal ??
    raw?.content ??
    raw?.i18n?.[0]?.content ??
    raw?.i18n?.find?.((x: any) => x?.content)?.content ??
    "";

  const replies = Array.isArray(raw?.replies) ? raw.replies.map(normalizeComment) : [];

  return {
    id: String(raw?.id ?? ""),
    authorName: String(raw?.author?.nickname ?? raw?.authorName ?? "익명"),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    content: String(content),
    replies,
  };
}

function Divider() {
  return <div className="my-6 h-px w-full bg-gray-100" />;
}

function CommentItem({ c, depth = 0 }: { c: Comment; depth?: number }) {
  return (
    <div className={depth > 0 ? "pl-4 border-l border-gray-100" : ""}>
      <div className="rounded-lg px-1 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{c.authorName}</p>
            <p className="text-xs text-gray-500">
              {formatRelative(c.createdAt)} · {formatFull(c.createdAt)}
            </p>
          </div>
        </div>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">{c.content}</p>

        {c.replies?.length ? (
          <div className="mt-3 space-y-2">
            {c.replies.map((r) => (
              <CommentItem key={r.id} c={r} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ToggleLikeResult = {
  likeCount?: number;
  liked?: boolean;
};

function extractToggleLikeResult(payload: any): ToggleLikeResult {
  const raw = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  if (!raw || typeof raw !== "object") return {};
  const likeCount =
    typeof raw.likeCount === "number"
      ? raw.likeCount
      : typeof raw.likes === "number"
      ? raw.likes
      : undefined;

  const liked =
    typeof raw.liked === "boolean"
      ? raw.liked
      : typeof raw.isLiked === "boolean"
      ? raw.isLiked
      : undefined;

  return { likeCount, liked };
}

export default function CommunityDetailClient() {
  const params = useParams<{ id: string }>();
  const postId = String(params?.id ?? "");
  const { tr, lang } = useI18n();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [liking, setLiking] = useState(false);
  const [likedByMe, setLikedByMe] = useState(false);

  async function load() {
    if (!postId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiGetCommunityPost(postId);
      const raw = (res as any)?.data && typeof (res as any).data === "object" ? (res as any).data : res;

      setPost(normalizePost(raw));
      setComments(Array.isArray(raw?.comments) ? raw.comments.map(normalizeComment) : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const originalLang = useMemo(() => (lang === "JP" ? "JA" : "KO"), [lang]);

  async function onLikeClick() {
    if (!postId) return;

    setLiking(true);
    try {
      const userId = await resolveUserId();
      if (!userId) {
        alert(tr("로그인이 필요합니다.", "ログインが必要です。"));
        return;
      }

      const res = await apiToggleCommunityPostLike(postId, userId);
      const { likeCount, liked } = extractToggleLikeResult(res);

      setPost((prev) => {
        if (!prev) return prev;

        if (typeof likeCount === "number") {
          return { ...prev, likes: likeCount };
        }

        const nextLiked = typeof liked === "boolean" ? liked : !likedByMe;
        const delta = nextLiked ? 1 : -1;
        return { ...prev, likes: Math.max(0, prev.likes + delta) };
      });

      setLikedByMe((prev) => (typeof liked === "boolean" ? liked : !prev));
    } catch (e: any) {
      alert(e?.message ?? tr("좋아요 처리에 실패했습니다.", "いいね処理に失敗しました。"));
    } finally {
      setLiking(false);
    }
  }

  async function submitComment() {
    const content = commentDraft.trim();
    if (!content) return;

    setPostingComment(true);
    try {
      const authorId = await resolveUserId();
      if (!authorId) {
        alert(tr("로그인이 필요합니다.", "ログインが必要です。"));
        return;
      }

      const res = await apiPostCommunityComment(postId, {
        authorId,
        content,
        originalLang,
      });

      const raw = (res as any)?.data && typeof (res as any).data === "object" ? (res as any).data : res;
      const created = raw && typeof raw === "object" ? normalizeComment(raw) : null;

      if (created && created.id) {
        setComments((prev) => [...prev, created]);
        setPost((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev));
      } else {
        setPost((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev));
      }

      setCommentDraft("");
    } catch (e: any) {
      alert(e?.message ?? tr("댓글 작성에 실패했습니다.", "コメント投稿に失敗しました。"));
    } finally {
      setPostingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[980px] px-6 lg:px-10 py-10">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[980px] px-6 lg:px-10 py-10">
          <p className="text-sm text-red-600">{error}</p>
          <Link href="/community" className="mt-4 inline-block text-sm text-gray-700 underline">
            {tr("목록으로", "一覧へ")}
          </Link>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[980px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/community?tab=${post.category}`}
            className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} strokeWidth={2} className="text-gray-500 group-hover:text-gray-700" />
            {tr("목록", "一覧")}
          </Link>
          <div />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {/* Header */}
          <div className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={categoryBadge(post.category)}>
                    {tr(categoryTextKR(post.category), categoryTextJP(post.category))}
                  </span>

                  <h1 className="min-w-0 text-xl md:text-2xl font-extrabold text-gray-900 leading-snug">
                    {post.title}
                  </h1>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{post.authorName}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-gray-500">{formatFull(post.createdAt)}</span>
                  {post.updatedAt ? (
                    <>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-gray-500">
                        {tr("수정", "更新")}: {formatFull(post.updatedAt)}
                      </span>
                    </>
                  ) : null}
                </div>

                {post.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-5 text-xs text-gray-600 md:justify-end">
                <div className="flex items-center gap-1">
                  <Eye size={14} strokeWidth={1.6} className="text-gray-400" />
                  <span>{post.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquareText size={14} strokeWidth={1.6} className="text-gray-400" />
                  <span>{post.commentsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Header/Content divider */}
          <div className="h-px w-full bg-gray-100" />

          {/* Content */}
          <div className="p-5">
            <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{post.content}</div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onLikeClick}
                disabled={liking}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  liking
                    ? "border-gray-200 bg-white text-gray-400"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                <ThumbsUp
                  size={16}
                  strokeWidth={1.8}
                  className={likedByMe || post.likes > 0 ? "text-blue-600" : "text-gray-400"}
                />
                {liking ? tr("처리 중...", "処理中...") : tr("좋아요", "いいね")}
                <span className="text-gray-400">({post.likes})</span>
              </button>
            </div>
          </div>

          {/* ✅ 댓글 위 “굵은 구분선” 제거. 여백으로만 분리 */}
          <div className="px-5 pb-5">
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-gray-900">
                  {tr("댓글", "コメント")} <span className="text-gray-400">({comments.length})</span>
                </h2>
              </div>

              <Divider />

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder={tr("댓글을 입력하세요", "コメントを入力してください")}
                  className="h-[110px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={postingComment || commentDraft.trim().length === 0}
                    className={[
                      "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                      postingComment || commentDraft.trim().length === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700",
                    ].join(" ")}
                  >
                    {postingComment ? tr("등록 중...", "投稿中...") : tr("등록", "投稿")}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {comments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    {tr("댓글이 없습니다.", "コメントがありません。")}
                  </p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {comments.map((c) => (
                      <div key={c.id} className="py-2">
                        <CommentItem c={c} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}