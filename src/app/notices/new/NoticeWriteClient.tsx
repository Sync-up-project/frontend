"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetMyPage, apiPostNotice } from "@/lib/api";
export default function NoticeWriteClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);

  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // 관리자 판별: /mypage role 기반
  useEffect(() => {
    let mounted = true;
    (async () => {
      setCheckingRole(true);
      try {
        const me = await apiGetMyPage();
        const role =
          (me as any)?.user?.role ??
          (me as any)?.data?.user?.role ??
          (me as any)?.role;

        const roleStr = String(role ?? "").toUpperCase();

        // 프로젝트의 ROLE enum에 맞게 조정 가능
        const ok =
          roleStr === "ADMIN" ||
          roleStr === "OWNER" ||
          roleStr === "MANAGER" ||
          roleStr.includes("ADMIN");

        if (mounted) setIsAdmin(Boolean(ok));
      } catch {
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setCheckingRole(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && content.trim().length > 0 && !submitting;
  }, [title, content, submitting]);

  async function onSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await apiPostNotice({
        title: title.trim(),
        content: content.trim(),
        pinned,
      });

      const raw = res?.data && typeof res.data === "object" ? res.data : res;
      const id = raw?.id ?? raw?.noticeId;

      if (id) router.push(`/notices/${id}`);
      else router.push(`/notices`);
    } catch (e: any) {
      alert(e?.message ?? "공지 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // 권한 확인 중
  if (checkingRole) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[960px] px-6 lg:px-10 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <p className="text-sm text-gray-700">권한 확인 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 관리자 아니라면 접근 차단(UX: 목록으로 안내)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[960px] px-6 lg:px-10 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <p className="text-sm font-semibold text-gray-900">권한이 없습니다.</p>
            <p className="mt-2 text-sm text-gray-600">
              공지 작성은 관리자만 가능합니다.
            </p>

            <div className="mt-6">
              <Link
                href="/notices"
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
              >
                공지 목록으로
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[960px] px-6 lg:px-10 py-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">공지 작성</h1>
            <p className="mt-1 text-sm text-gray-600">
              제목과 내용을 입력한 뒤 등록하세요.
            </p>
          </div>

          <Link
            href="/notices"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            목록으로
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-6 space-y-6">
            {/* pinned */}
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">상단 고정</p>
                <p className="mt-1 text-xs text-gray-500">
                  고정된 공지는 목록 상단에 표시됩니다.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="h-4 w-4"
                />
                고정
              </label>
            </div>

            {/* title */}
            <div>
              <p className="text-sm font-semibold text-gray-900">제목</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
              />
              <p className="mt-2 text-xs text-gray-500">{title.trim().length}/100</p>
            </div>

            {/* content */}
            <div>
              <p className="text-sm font-semibold text-gray-900">내용</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                rows={12}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
              />
              <p className="mt-2 text-xs text-gray-500">{content.trim().length}/5000</p>
            </div>

            {/* attachments (UI only) */}
            <div>
              <p className="text-sm font-semibold text-gray-900">첨부파일</p>
              <input
                type="file"
                multiple
                disabled
                className="mt-2 block w-full text-sm text-gray-400 cursor-not-allowed"
                title="업로드 API 연동 필요"
              />
              <p className="mt-2 text-xs text-gray-500">
                업로드 API가 준비되면 파일도 서버로 전송되도록 연동할 예정입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white p-6">
            <Link
              href="/notices"
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
