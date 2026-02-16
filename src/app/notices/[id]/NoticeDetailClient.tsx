"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Notice = {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO
  authorName: string;
  attachments?: { name: string; type: string; size: number }[];
};

const LOCAL_NOTICES_KEY = "syncup_local_notices";

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
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

export default function NoticeDetailClient() {
  const params = useParams<{ id: string }>();
  const noticeId = params?.id ?? "";

  const [item, setItem] = useState<Notice | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!noticeId) return;

    const stored = safeParseJson<Notice[]>(localStorage.getItem(LOCAL_NOTICES_KEY), []);
    const found = stored.find((n) => n.id === noticeId);

    if (!found) {
      setNotFound(true);
      setItem(null);
      return;
    }

    setNotFound(false);
    setItem(found);
  }, [noticeId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <h1 className="text-lg font-semibold text-gray-900">공지를 찾을 수 없습니다.</h1>
            <p className="mt-2 text-sm text-gray-600">삭제되었거나, 잘못된 주소일 수 있습니다.</p>
            <div className="mt-6">
              <Link
                href="/notices"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                공지 목록으로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 break-words">{item.title}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>작성자 {item.authorName}</span>
              <span>·</span>
              <span>{formatRelativeTime(item.createdAt)}</span>
              {item.attachments && item.attachments.length > 0 ? (
                <>
                  <span>·</span>
                  <span>첨부 {item.attachments.length}개</span>
                </>
              ) : null}
            </div>
          </div>

          <Link
            href="/notices"
            className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            목록으로
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="lg:col-span-9 min-w-0">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <SectionTitle>내용</SectionTitle>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-800">
                {item.content}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
              <SectionTitle>첨부</SectionTitle>
              {item.attachments && item.attachments.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {item.attachments.map((a, idx) => (
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
                현재 단계에서는 파일 자체를 저장하지 않고, 파일 정보만 표시합니다.
              </p>
            </div>
          </main>

          <aside className="lg:col-span-3 lg:sticky lg:top-[92px] h-fit space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <SectionTitle>안내</SectionTitle>
              <p className="mt-3 text-sm text-gray-700">
                공지사항은 서비스 운영과 관련된 중요한 정보를 제공합니다.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
