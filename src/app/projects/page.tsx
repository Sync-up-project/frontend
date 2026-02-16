"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProjectItem = {
  id: string;
  ownerId: string;
  originalLang: string;
  titleOriginal: string;
  summaryOriginal: string;
  mode: string;
  difficulty: string;
  status: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
};

export default function ProjectsListPage() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch("/api/projects?limit=20", { cache: "no-store" });
      const text = await res.text();

      if (!res.ok) {
        setErrorMsg(`불러오기 실패: ${res.status} ${res.statusText}\n${text}`);
        setItems([]);
        setLoading(false);
        return;
      }

      if (!text) {
        setItems([]);
        setLoading(false);
        return;
      }

      const json = JSON.parse(text);
      setItems(json.items ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">프로젝트</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            전체 프로젝트 목록이에요 ✨
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/drafts"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-neutral-900"
          >
            드래프트
          </Link>
          <Link
            href="/"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-neutral-900"
          >
            홈
          </Link>
        </div>
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
            아직 생성된 프로젝트가 없어요.
          </div>
        ) : (
          <ul className="divide-y dark:divide-neutral-800">
            {items.map((p) => (
              <li
                key={p.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {p.titleOriginal}
                  </Link>

                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {p.status}
                  </span>

                  <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                    {p.mode} / {p.difficulty}
                  </span>

                  <span className="ml-auto text-xs text-gray-500 dark:text-neutral-400">
                    {new Date(p.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                  {p.summaryOriginal}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
