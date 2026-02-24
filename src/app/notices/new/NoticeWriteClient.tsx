"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { fetchCurrentUser, getCurrentUser, saveCurrentUser } from "@/lib/auth";
import { apiPostNotice } from "@/lib/noticeApi";

async function resolveAuthorId(): Promise<string | null> {
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

export default function NoticeWriteClient() {
  const router = useRouter();
  const { tr, lang } = useI18n();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && content.trim().length > 0 && !submitting;
  }, [title, content, submitting]);

  async function onSubmit() {
    if (!canSubmit) return;

    const authorId = await resolveAuthorId();
    if (!authorId) {
      alert(tr("로그인이 필요합니다.", "ログインが必要です。"));
      return;
    }

    setSubmitting(true);
    try {
      const originalLang = lang === "JP" ? "JA" : "KO";
      const res = await apiPostNotice({
        authorId,
        title: title.trim(),
        content: content.trim(),
        pinned,
        originalLang,
      });

      const raw = (res as any)?.data && typeof (res as any).data === "object" ? (res as any).data : res;
      const id = raw?.id ?? raw?.noticeId;

      if (id) router.push(`/notices/${id}`);
      else router.push(`/notices`);
    } catch (e: any) {
      alert(e?.message ?? tr("공지 작성에 실패했습니다.", "作成に失敗しました。"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[960px] px-6 lg:px-10 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{tr("공지 작성", "お知らせ作成")}</h1>
            <p className="mt-1 text-sm text-gray-500">{tr("제목과 내용을 입력한 뒤 등록하세요.", "タイトルと内容を入力して作成します。")}</p>
          </div>

          <Link href="/notices" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
            {tr("목록으로", "一覧へ")}
          </Link>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{tr("상단 고정", "固定")}</p>
                <p className="mt-1 text-xs text-gray-500">{tr("고정된 공지는 목록 상단에 표시됩니다.", "固定されたお知らせは上部に表示されます。")}</p>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="h-4 w-4"
                />
                {tr("고정", "固定")}
              </label>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">{tr("제목", "タイトル")}</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tr("제목을 입력하세요", "タイトルを入力")}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500">{title.trim().length}/100</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">{tr("내용", "内容")}</p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={tr("내용을 입력하세요", "内容を入力")}
                rows={12}
                className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500">{content.trim().length}/5000</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-white p-6">
            <Link
              href="/notices"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {tr("취소", "キャンセル")}
            </Link>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className={[
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                canSubmit ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed",
              ].join(" ")}
            >
              {submitting ? tr("등록 중...", "作成中...") : tr("등록", "作成")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}