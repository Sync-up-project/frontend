"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { login, getAccessToken, getCurrentUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 .5C5.73.5.75 5.6.75 12.1c0 5.2 3.44 9.6 8.2 11.16.6.12.82-.27.82-.6 0-.3-.01-1.1-.02-2.16-3.34.75-4.04-1.66-4.04-1.66-.54-1.42-1.33-1.8-1.33-1.8-1.09-.77.08-.76.08-.76 1.2.09 1.83 1.28 1.83 1.28 1.07 1.9 2.8 1.35 3.49 1.03.11-.8.42-1.35.76-1.66-2.67-.32-5.47-1.38-5.47-6.12 0-1.35.46-2.45 1.22-3.32-.12-.32-.53-1.62.12-3.38 0 0 1.01-.33 3.3 1.27.96-.27 1.98-.4 3-.4s2.04.14 3 .4c2.29-1.6 3.3-1.27 3.3-1.27.65 1.76.24 3.06.12 3.38.76.87 1.22 1.97 1.22 3.32 0 4.76-2.8 5.8-5.48 6.11.43.39.82 1.16.82 2.34 0 1.69-.02 3.05-.02 3.46 0 .33.22.73.83.6 4.75-1.56 8.18-5.96 8.18-11.16C23.25 5.6 18.27.5 12 .5z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tr } = useI18n();

  const next = searchParams.get("next") || "/projects";
  const oauth = searchParams.get("oauth"); // success | failed | null

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [oauthChecking, setOauthChecking] = useState(false);
  const [error, setError] = useState<string>("");

  // 이미 로그인 되어 있으면 바로 이동
  useEffect(() => {
    const token = getAccessToken();
    if (token) router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OAuth로 돌아왔을 때 처리
  useEffect(() => {
    let mounted = true;

    async function handleOAuthReturn() {
      if (!oauth) return;

      if (oauth === "failed") {
        setError(
          tr(
            "GitHub 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            "GitHubログインに失敗しました。しばらくしてから再度お試しください。"
          )
        );
        return;
      }

      if (oauth === "success") {
        setOauthChecking(true);
        setError("");
        try {
          const me = await getCurrentUser();
          if (!mounted) return;

          if (me) {
            router.replace(next);
            return;
          }

          setError(
            tr(
              "GitHub 로그인은 완료되었지만 사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.",
              "GitHubログインは完了しましたが、ユーザー情報を確認できません。再度ログインしてください。"
            )
          );
        } catch {
          if (!mounted) return;
          setError(
            tr(
              "GitHub 로그인 후 세션 확인에 실패했습니다. 백엔드 상태를 확인해 주세요.",
              "GitHubログイン後のセッション確認に失敗しました。バックエンドの状態をご確認ください。"
            )
          );
        } finally {
          if (!mounted) return;
          setOauthChecking(false);
        }
      }
    }

    handleOAuthReturn();

    return () => {
      mounted = false;
    };
  }, [oauth, next, router, tr]);

  const canSubmit = useMemo(() => {
    if (!isValidEmail(email.trim())) return false;
    if (password.length < 1) return false;
    return true;
  }, [email, password]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!canSubmit) {
      setError(
        tr(
          "이메일/비밀번호를 확인해 주세요.",
          "メール/パスワードをご確認ください。"
        )
      );
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
      setError(
        err instanceof Error
          ? err.message
          : tr("로그인에 실패했습니다.", "ログインに失敗しました。")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onGithubLogin() {
    setError("");

    const backend = getBackendBaseUrl();
    const url = new URL(`${backend}/auth/github`);
    url.searchParams.set("next", next);

    window.location.href = url.toString();
  }

  const isBusy = submitting || oauthChecking;

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
                  disabled={isBusy}
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
                  placeholder={tr(
                    "비밀번호를 입력해 주세요",
                    "パスワードを入力してください"
                  )}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                  autoComplete="current-password"
                  disabled={isBusy}
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {/* ✅ 검정 로그인 버튼 */}
              <button
                type="submit"
                disabled={!canSubmit || submitting || oauthChecking}
                className={[
                  "w-full py-3 rounded-lg transition-colors font-medium",
                  !canSubmit || submitting || oauthChecking
                    ? "bg-gray-500 text-white cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800",
                ].join(" ")}
              >
                {submitting
                  ? tr("로그인 중...", "ログイン中...")
                  : tr("로그인", "ログイン")}
              </button>

              {/* ✅ GitHub 로그인 버튼: 검정 로그인 버튼 아래 */}
              <button
                type="button"
                onClick={onGithubLogin}
                disabled={isBusy}
                className={[
                  "w-full py-3 rounded-lg transition-colors font-medium border flex items-center justify-center gap-2",
                  isBusy
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                    : "bg-white text-gray-900 hover:bg-gray-50 border-gray-300",
                ].join(" ")}
              >
                <GithubIcon className="h-5 w-5" />
                {oauthChecking
                  ? tr("GitHub 로그인 확인 중...", "GitHubログイン確認中...")
                  : tr("GitHub로 로그인", "GitHubでログイン")}
              </button>
              <div className="flex items-center justify-between pt-2">
                <Link href="/signup" className="text-sm text-gray-700 hover:underline">
                  {tr("회원가입", "会員登録")}
                </Link>

                <Link href="/" className="text-sm text-gray-500 hover:underline">
                  {tr("홈으로", "ホームへ")}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}