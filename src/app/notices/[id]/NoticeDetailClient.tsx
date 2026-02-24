"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, ThumbsUp } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { fetchCurrentUser, getCurrentUser, saveCurrentUser } from "@/lib/auth";
import { apiGetNotice, apiToggleNoticeLike, type NoticeDetail } from "@/lib/noticeApi";

function formatFullDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(
    2,
    "0",
  )} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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

function normalizeNotice(raw: any): NoticeDetail {
  return {
    id: String(raw?.id ?? raw?.noticeId ?? ""),
    pinned: Boolean(raw?.pinned ?? false),
    titleOriginal: raw?.titleOriginal,
    contentOriginal: raw?.contentOriginal,
    title: raw?.title ?? raw?.titleOriginal ?? raw?.i18n?.[0]?.title ?? "",
    content: raw?.content ?? raw?.contentOriginal ?? raw?.i18n?.[0]?.content ?? "",
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
    viewCount: Number(raw?.viewCount ?? 0),
    likeCount: typeof raw?.likeCount === "number" ? raw.likeCount : undefined,
    author: raw?.author,
    i18n: raw?.i18n,
  };
}

export default function NoticeDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { tr } = useI18n();

  const noticeId = String((params as any)?.id ?? "");

  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liking, setLiking] = useState(false);
  const [likedByMe, setLikedByMe] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);

  useEffect(() => {
    if (!noticeId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetNotice(noticeId);
        const raw = (res as any)?.data && typeof (res as any).data === "object" ? (res as any).data : res;
        const normalized = normalizeNotice(raw);

        if (mounted) {
          setNotice(normalized);
          setLocalLikeCount(Number(normalized.likeCount ?? 0));
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load notice");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [noticeId]);

  const title = useMemo(() => notice?.title ?? notice?.titleOriginal ?? "", [notice]);
  const content = useMemo(() => notice?.content ?? notice?.contentOriginal ?? "", [notice]);

  async function onLikeClick() {
    if (!noticeId) return;
    setLiking(true);

    try {
      const userId = await resolveUserId();
      if (!userId) {
        alert(tr("로그인이 필요합니다.", "ログインが必要です。"));
        return;
      }

      const res = await apiToggleNoticeLike(noticeId);

      // 1) 엔드포인트 없으면 UI만 토글 (allow404)
      if (!res) {
        setLikedByMe((prev) => !prev);
        setLocalLikeCount((prev) => Math.max(0, prev + (!likedByMe ? 1 : -1)));
        return;
      }

      // 2) 서버가 likeCount/liked를 주면 사용
      const raw = (res as any)?.data && typeof (res as any).data === "object" ? (res as any).data : res;
      const serverCount =
        typeof raw?.likeCount === "number" ? raw.likeCount : typeof raw?.likes === "number" ? raw.likes : undefined;
      const serverLiked =
        typeof raw?.liked === "boolean" ? raw.liked : typeof raw?.isLiked === "boolean" ? raw.isLiked : undefined;

      if (typeof serverCount === "number") setLocalLikeCount(serverCount);
      if (typeof serverLiked === "boolean") setLikedByMe(serverLiked);

      if (typeof serverCount !== "number" && typeof serverLiked !== "boolean") {
        setLikedByMe((prev) => !prev);
        setLocalLikeCount((prev) => Math.max(0, prev + (!likedByMe ? 1 : -1)));
      }
    } catch (e: any) {
      alert(e?.message ?? tr("좋아요 처리에 실패했습니다.", "いいね処理に失敗しました。"));
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[980px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-center justify-between">
          {/* ✅ 항상 목록으로 이동하도록 고정 */}
          <button
            type="button"
            onClick={() => router.push("/notices")}
            className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} className="text-gray-500 group-hover:text-gray-700" />
            {tr("목록", "一覧")}
          </button>

          <Link href="/notices" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
            {tr("공지 목록", "お知らせ一覧")}
          </Link>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-gray-500">{tr("불러오는 중...", "読み込み中...")}</p>
          ) : error ? (
            <>
              <p className="text-sm font-semibold text-red-600">{tr("공지사항을 불러오지 못했습니다.", "読み込みに失敗しました。")}</p>
              <p className="mt-2 text-xs text-gray-500 break-words">{error}</p>
            </>
          ) : !notice?.id ? (
            <p className="text-sm text-gray-500">{tr("공지사항이 존재하지 않습니다.", "お知らせがありません。")}</p>
          ) : (
            <>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.pinned ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        {tr("업데이트", "アップデート")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {tr("서비스", "サービス")}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-3 text-2xl font-extrabold text-gray-900">{title}</h1>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{notice.author?.nickname ?? tr("작성자", "作成者")}</span>
                    <span className="text-gray-300">|</span>
                    <span>{formatFullDate(notice.createdAt)}</span>
                    {notice.updatedAt ? (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>
                          {tr("수정", "更新")}: {formatFullDate(notice.updatedAt)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Eye size={16} className="text-gray-400" />
                    <span>{notice.viewCount}</span>
                  </div>

                  <button
                    type="button"
                    onClick={onLikeClick}
                    disabled={liking}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                      liking ? "border-gray-200 text-gray-400" : "border-gray-200 text-gray-700 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <ThumbsUp
                      size={16}
                      className={likedByMe || localLikeCount > 0 ? "text-blue-600" : "text-gray-400"}
                    />
                    {tr("좋아요", "いいね")}
                    <span className="text-gray-400">({localLikeCount})</span>
                  </button>
                </div>
              </div>

              <div className="my-6 h-px w-full bg-gray-100" />

              <div className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{content}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}