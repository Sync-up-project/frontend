"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { adminLogin } from "@/lib/auth";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return isValidEmail(email.trim()) && password.length > 0;
  }, [email, password]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!canSubmit) {
      setError("이메일과 비밀번호를 확인해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminLogin({ email: email.trim(), password });
      if (result.user?.accountRole !== "ADMIN") {
        setError("관리자 권한이 없는 계정입니다.");
        return;
      }
      router.replace(next.startsWith("/admin") ? next : "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold text-gray-400 hover:text-white">
            SyncUp
          </Link>
          <h1 className="mt-5 text-2xl font-bold tracking-normal">Admin Console</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            사전에 등록된 관리자 계정만 접근할 수 있습니다.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-200">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              placeholder="admin@example.com"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-200">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              placeholder="관리자 비밀번호"
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-md border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-white px-4 text-sm font-bold text-gray-950 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-gray-600"
          >
            {submitting ? "확인 중..." : "관리자 로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
