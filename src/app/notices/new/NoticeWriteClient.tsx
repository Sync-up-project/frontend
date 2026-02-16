"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

type Notice = {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO
  authorName: string;
  attachments?: { name: string; type: string; size: number }[];
};

const LOCAL_NOTICES_KEY = "syncup_local_notices";
const NOTICE_CHANGED_EVENT = "local-notices:changed";

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

function isAdminUser(user: any): boolean {
  if (!user) return false;

  const role = String(user.role ?? "").toLowerCase();
  if (role === "admin" || role === "administrator") return true;

  const email = String(user.email ?? "").toLowerCase();
  const nickname = String(user.nickname ?? "").toLowerCase();

  if (email === "admin@syncup.local") return true;
  if (nickname === "admin") return true;

  return false;
}

export default function NoticeWriteClient() {
  const router = useRouter();
  const user = getCurrentUser();
  const isAdmin = isAdminUser(user);

  const authorName = useMemo(() => {
    return user?.nickname ?? user?.email ?? "Admin";
  }, [user]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
  }

  function validate() {
    const t = title.trim();
    const c = content.trim();

    if (!t) return "제목을 입력해 주세요.";
    if (!c) return "내용을 입력해 주세요.";
    if (t.length > 100) return "제목은 100자 이내로 입력해 주세요.";
    return null;
  }

  function save() {
    if (!isAdmin) return;

    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);

    const newNotice: Notice = {
      id: uid("n"),
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
      authorName,
      attachments: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    };

    const current = safeParseJson<Notice[]>(localStorage.getItem(LOCAL_NOTICES_KEY), []);
    const next = [newNotice, ...current];

    localStorage.setItem(LOCAL_NOTICES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NOTICE_CHANGED_EVENT));

    router.push("/notices");
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-10">
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <h1 className="text-lg font-semibold text-gray-900">접근 권한이 없습니다.</h1>
            <p className="mt-2 text-sm text-gray-600">공지 작성은 어드민 계정만 가능합니다.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push("/notices")}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                공지 목록으로 이동
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1560px] px-6 lg:px-10 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">공지 작성</h1>
            <p className="mt-1 text-sm text-gray-600">제목과 내용은 필수 항목입니다.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/notices")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              등록
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="lg:col-span-9">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900">제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="공지 제목을 입력해 주세요."
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-2 text-xs text-gray-500">최대 100자.</p>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-900">내용</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="공지 내용을 입력해 주세요."
                  className="mt-2 min-h-[320px] w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-900">첨부</label>
                <input
                  type="file"
                  multiple
                  onChange={onPickFiles}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
                />
                <p className="mt-2 text-xs text-gray-500">
                  현재 단계에서는 파일 자체를 저장하지 않고, 파일 정보만 저장합니다.
                </p>
              </div>

              {files.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {files.map((f) => (
                    <li
                      key={`${f.name}_${f.size}_${f.lastModified}`}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm text-gray-900">{f.name}</span>
                      <span className="text-xs text-gray-500">{Math.round(f.size / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {error ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              ) : null}
            </div>
          </main>

          <aside className="lg:col-span-3 lg:sticky lg:top-[92px] h-fit space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm font-semibold text-gray-900">작성 정보</p>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>작성자: {authorName}</p>
                <p>권한: Admin</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
