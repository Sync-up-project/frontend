"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  type: string;
  version: number;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  promptHash: string | null;
};

export default function DraftsListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/ai/artifacts?limit=20", {
          cache: "no-store",
        });
        const text = await res.text();

        if (!res.ok) {
          setErrorMsg(`불러오기 실패: ${res.status} ${res.statusText}\n${text}`);
          setItems([]);
          setLoading(false);
          return;
        }
        if (!text) {
          setErrorMsg("응답이 비어 있어요.");
          setItems([]);
          setLoading(false);
          return;
        }

        const json = JSON.parse(text);
        setItems(json.items ?? []);
        setLoading(false);
      } catch (e) {
        setErrorMsg(String(e));
        setItems([]);
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">드래프트</h1>
            <p className="mt-1 text-sm text-gray-600">
              최근 생성된 AI 초안 목록이에요 ✨
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            홈
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-5 text-sm text-gray-600">불러오는 중...</div>
          ) : errorMsg ? (
            <pre className="p-5 text-xs text-red-700 whitespace-pre-wrap">
              {errorMsg}
            </pre>
          ) : items.length === 0 ? (
            <div className="p-5 text-sm text-gray-600">
              아직 생성된 드래프트가 없어요.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={it.id} className="p-5 hover:bg-gray-50">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/drafts/${it.id}`}
                      className="font-semibold text-indigo-600 hover:underline"
                    >
                      {it.id}
                    </Link>

                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                      {it.type} v{it.version}
                    </span>

                    {it.projectId ? (
                      <Link
                        href={`/projects/${it.projectId}`}
                        className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        연결된 프로젝트
                      </Link>
                    ) : (
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        드래프트만
                      </span>
                    )}

                    <span className="ml-auto text-xs text-gray-500">
                      {new Date(it.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {it.promptHash && (
                    <div className="mt-2 text-xs text-gray-500">
                      프롬프트 해시: <code>{it.promptHash}</code>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
