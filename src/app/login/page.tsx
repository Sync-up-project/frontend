"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  login,
  getAccessToken,
  fetchCurrentUser,
  consumeOAuthSession,
  getApiBaseUrl,
} from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
          const { accessToken } = await consumeOAuthSession();
          if (!accessToken) {
            throw new Error("GitHub 로그인 토큰을 저장하지 못했습니다.");
          }

          const me = await fetchCurrentUser();
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

    const backend = getApiBaseUrl();
    const url = new URL(`${backend}/auth/github`);
    url.searchParams.set("next", next);

    window.location.href = url.toString();
  }

  const isBusy = submitting || oauthChecking;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <Link
            href="/"
            aria-label="Go to home"
            className="rounded-2xl bg-black/5 p-3 ring-1 ring-black/10 shadow-xl shadow-black/10 transition hover:shadow-black/20 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:bg-white/5 dark:ring-white/10 dark:shadow-black/30 dark:hover:shadow-black/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo/syncup-icon.png"
              alt="SyncUp logo"
              className="h-14 w-14 object-contain rounded-xl"
            />
          </Link>
          <h1 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">{tr("로그인", "ログイン")}</h1>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl dark:bg-black/20 dark:backdrop-blur dark:border-white/10">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 dark:text-white/90">
                {tr("이메일", "メール")}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tr("이메일을 입력해 주세요", "メールアドレスを入力してください")}
                className="w-full h-11 px-4 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 dark:border-white/10 dark:focus:ring-sky-500/50"
                autoComplete="email"
                disabled={isBusy}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 dark:text-white/90">
                {tr("비밀번호", "パスワード")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr("비밀번호를 입력해 주세요", "パスワードを入力してください")}
                className="w-full h-11 px-4 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 dark:border-white/10 dark:focus:ring-sky-500/50"
                autoComplete="current-password"
                disabled={isBusy}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || isBusy}
              className={[
                "w-full h-11 rounded-lg font-semibold transition-colors",
                !canSubmit || isBusy
                  ? "bg-slate-600 text-white/80 cursor-not-allowed"
                  : "bg-sky-500 text-white hover:bg-sky-400",
              ].join(" ")}
            >
              {submitting ? tr("로그인 중...", "ログイン中...") : tr("로그인", "ログイン")}
            </button>

            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
              <div className="text-xs text-gray-500 dark:text-white/60">{tr("또는", "または")}</div>
              <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            </div>

            <button
              type="button"
              onClick={onGithubLogin}
              disabled={isBusy}
              className={[
                "h-11 w-full rounded-lg border flex items-center justify-center gap-2 transition-colors font-semibold",
                "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
                "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
                isBusy ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <GithubIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">
                {oauthChecking
                  ? tr("GitHub 로그인 확인 중...", "GitHubログイン確認中...")
                  : tr("GitHub로 로그인", "GitHubでログイン")}
              </span>
            </button>

            <div className="pt-2 text-center text-sm text-gray-600 dark:text-white/70">
              {tr("아직 회원이 아니신가요?", "まだ会員ではありませんか？")}{" "}
              <Link href="/signup" className="text-sky-600 hover:text-sky-700 underline dark:text-sky-300 dark:hover:text-sky-200">
                {tr("회원가입", "会員登録")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
