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
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">드래프트</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            최근 생성된 AI 초안 목록이에요 ✨
          </p>
        </div>

        <Link
          href="/"
          className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-neutral-900"
        >
            홈
        </Link>
      </div>

      <div className="mt-6 rounded-xl border bg-white dark:bg-neutral-950">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">불러오는 중...</div>
        ) : errorMsg ? (
          <pre className="p-4 text-xs text-red-600 whitespace-pre-wrap">
            {errorMsg}
          </pre>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            아직 생성된 드래프트가 없어요.
          </div>
        ) : (
          <ul className="divide-y dark:divide-neutral-800">
            {items.map((it) => (
              <li
                key={it.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/drafts/${it.id}`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {it.id}
                  </Link>

                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {it.type} v{it.version}
                  </span>

                  {it.projectId ? (
                    <Link
                      href={`/projects/${it.projectId}`}
                      className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:underline dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                      연결된 프로젝트
                    </Link>
                  ) : (
                    <span className="rounded-md bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200">
                      드래프트만
                    </span>
                  )}

                  <span className="ml-auto text-xs text-gray-500 dark:text-neutral-400">
                    {new Date(it.createdAt).toLocaleString()}
                  </span>
                </div>

                {it.promptHash && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                    프롬프트 해시: <code>{it.promptHash}</code>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
