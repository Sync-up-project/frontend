// src/app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { login, getAccessToken } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tr } = useI18n();

  const next = searchParams.get("next") || "/projects";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  // 이미 로그인 되어 있으면 바로 이동
  useEffect(() => {
    const token = getAccessToken();
    if (token) router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    if (!isValidEmail(email.trim())) return false;
    if (password.length < 1) return false;
    return true;
  }, [email, password]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!canSubmit) {
      setError(tr("이메일/비밀번호를 확인해 주세요.", "メール/パスワードをご確認ください。"));
      return;
    }

    setSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password,
      });

      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("로그인에 실패했습니다.", "ログインに失敗しました。"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-gray-50 via-white to-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-gray-300 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-40 w-40 h-40 bg-gray-300 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gray-300 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 flex items-start justify-center min-h-[calc(100vh-64px)] px-6 lg:px-10 py-8">
        <div className="max-w-7xl w-full grid md:grid-cols-[minmax(0,1fr)_520px] gap-10 items-center">
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {tr("다시 만나서 반가워요", "おかえりなさい")}
              <br />
              <span className="text-gray-900">Sync Up</span>
            </h1>

            <p className="text-gray-700 leading-relaxed max-w-md">
              {tr(
                "이메일과 비밀번호로 로그인해 주세요.",
                "メールとパスワードでログインしてください。"
              )}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 w-full md:w-[520px] md:min-w-[520px] md:max-w-[520px] justify-self-end border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {tr("로그인", "ログイン")}
            </h2>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {tr("이메일", "メール")}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tr("user@test.com", "user@test.com")}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {tr("비밀번호", "パスワード")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tr("비밀번호를 입력해 주세요", "パスワードを入力してください")}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={[
                  "w-full py-3 rounded-lg transition-colors font-medium",
                  !canSubmit || submitting
                    ? "bg-gray-500 text-white cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800",
                ].join(" ")}
              >
                {submitting ? tr("로그인 중...", "ログイン中...") : tr("로그인", "ログイン")}
              </button>

              <div className="flex items-center justify-between pt-2">
                <Link href="/signup" className="text-sm text-gray-700 hover:underline">
                  {tr("회원가입", "会員登録")}
                </Link>

                <Link href="/" className="text-sm text-gray-500 hover:underline">
                  {tr("홈으로", "ホームへ")}
                </Link>
              </div>

              {/* OAuth는 아직 미구현이므로 UI만 둡니다 */}
              <div className="pt-4">
                <p className="text-xs text-gray-500">
                  {tr(
                    "OAuth 로그인은 백엔드 구현 완료 후 연결됩니다.",
                    "OAuthログインはバックエンド実装完了後に接続されます。"
                  )}
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
