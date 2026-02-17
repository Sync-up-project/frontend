"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGetNotice } from "@/lib/api";

type Notice = {
  id: string;
  title: string;
  titleJp?: string;
  content: string;
  contentJp?: string;
  createdAt: string;
  authorName: string;
  pinned: boolean;
};

function normalizeNotice(raw: any): Notice {
  return {
    id: String(raw?.id ?? raw?.noticeId ?? ""),
    title: String(raw?.title ?? ""),
    titleJp: raw?.titleJp ?? raw?.titleJa ?? raw?.titleJP,
    content: String(raw?.content ?? raw?.body ?? ""),
    contentJp: raw?.contentJp ?? raw?.contentJa ?? raw?.contentJP,
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? new Date().toISOString()),
    authorName: String(raw?.authorName ?? raw?.author?.nickname ?? raw?.author ?? ""),
    pinned: Boolean(raw?.pinned ?? raw?.isPinned ?? false),
  };
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

/**
 * NOTE:
 * - 기존 localStorage 기반 공지 상세 로직 제거
 * - API(GET /notices/:id) 응답 기반 렌더링
 */
export default function NoticeDetailClient() {
  const params = useParams();
  const router = useRouter();
  const noticeId = String((params as any)?.id ?? "");

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noticeId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetNotice(noticeId);

        // 백엔드가 { data: {...} }로 감싸서 줄 수도 있어 방어
        const raw = res?.data && typeof res.data === "object" ? res.data : res;
        const normalized = normalizeNotice(raw);

        if (mounted) setNotice(normalized);
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

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[960px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            ← 뒤로
          </button>

          <Link
            href="/notices"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            목록으로
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-8">
              <p className="text-sm text-gray-700">불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="p-8">
              <p className="text-sm text-red-600">공지사항을 불러오지 못했습니다.</p>
              <p className="mt-2 text-xs text-gray-500 break-words">{error}</p>
            </div>
          ) : !notice || !notice.id ? (
            <div className="p-8">
              <p className="text-sm text-gray-700">공지사항이 존재하지 않습니다.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {notice.pinned ? (
                        <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                          고정
                        </span>
                      ) : null}
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(notice.createdAt)}
                      </span>
                    </div>

                    <h1 className="mt-3 text-xl font-semibold text-gray-900">
                      {notice.title}
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">
                        {notice.authorName}
                      </span>
                      <span>·</span>
                      <span>{formatFullDate(notice.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Divider />

              {/* Body */}
              <div className="p-6">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">
                    {notice.content}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
