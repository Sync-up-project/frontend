// src/app/signup/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { checkNicknameAvailable, signup, login } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Signup() {
  const router = useRouter();
  const { tr } = useI18n();

  const [nickname, setNickname] = useState<string>("");
  const [nicknameChecked, setNicknameChecked] = useState<"idle" | "ok" | "fail">("idle");
  const [nicknameMsg, setNicknameMsg] = useState<string>("");

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // ✅ 이메일 인증 제거: emailVerified 조건 삭제
  const canSubmit = useMemo(() => {
    if (nicknameChecked !== "ok") return false;
    if (!isValidEmail(email)) return false;
    if (password.length < 8) return false;
    if (password !== passwordConfirm) return false;
    return true;
  }, [nicknameChecked, email, password, passwordConfirm]);

  async function onCheckNickname() {
    setError("");
    const trimmed = nickname.trim();
    if (!trimmed) {
      setNicknameChecked("fail");
      setNicknameMsg(tr("닉네임을 입력해 주세요.", "ニックネームを入力してください。"));
      return;
    }

    try {
      const ok = await checkNicknameAvailable(trimmed);
      if (ok) {
        setNicknameChecked("ok");
        setNicknameMsg(tr("사용 가능한 닉네임입니다.", "使用可能なニックネームです。"));
      } else {
        setNicknameChecked("fail");
        setNicknameMsg(tr("이미 사용 중인 닉네임입니다.", "すでに使用されているニックネームです。"));
      }
    } catch {
      // 백엔드 미구현/오류 시에도 로컬 플로우 유지
      setNicknameChecked("ok");
      setNicknameMsg(tr("닉네임 확인을 건너뛰고 진행합니다.", "ニックネーム確認をスキップして進めます。"));
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!canSubmit) {
      setError(tr("입력값을 다시 확인해 주세요.", "入力内容をご確認ください。"));
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
      });

      await login({ email: email.trim(), password });

      router.push("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("회원가입에 실패했습니다.", "会員登録に失敗しました。"));
  } finally {
      setSubmitting(false);
    }
  }

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
          <h1 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">{tr("회원가입", "会員登録")}</h1>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl dark:bg-black/20 dark:backdrop-blur dark:border-white/10">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 dark:text-white/90">
                {tr("닉네임", "ニックネーム")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setNicknameChecked("idle");
                    setNicknameMsg("");
                  }}
                    placeholder={tr("닉네임을 입력해 주세요", "ニックネームを入力してください")}
                  className="flex-1 h-11 px-4 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 dark:border-white/10 dark:focus:ring-sky-500/50"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={onCheckNickname}
                  disabled={submitting}
                  className={[
                    "h-11 px-4 rounded-lg border text-sm font-semibold transition-colors",
                    "border-gray-200 bg-gray-900 text-white hover:bg-gray-800",
                    "dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-black/40",
                    submitting ? "opacity-60 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {tr("중복확인", "重複確認")}
                </button>
              </div>

              {nicknameMsg ? (
                <p
                  className={[
                    "mt-2 text-sm",
                    nicknameChecked === "ok" ? "text-emerald-200" : "text-red-200",
                  ].join(" ")}
                >
                  {nicknameMsg}
                </p>
              ) : null}
            </div>

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
                disabled={submitting}
                autoComplete="email"
              />
              {!email.trim() ? null : isValidEmail(email.trim()) ? (
                <p className="mt-2 text-sm text-emerald-200">
                  {tr("사용 가능한 이메일 형식입니다.", "使用可能なメール形式です。")}
                </p>
              ) : (
                <p className="mt-2 text-sm text-red-200">
                  {tr("이메일 형식을 확인해 주세요.", "メールアドレスの形式をご確認ください。")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 dark:text-white/90">
                {tr("비밀번호", "パスワード")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr("비밀번호를 입력해 주세요 (8자 이상)", "パスワードを入力してください（8文字以上）")}
                className="w-full h-11 px-4 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 dark:border-white/10 dark:focus:ring-sky-500/50"
                disabled={submitting}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 dark:text-white/90">
                {tr("비밀번호 확인", "パスワード確認")}
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={tr("비밀번호를 다시 입력해 주세요", "パスワードをもう一度入力してください")}
                className="w-full h-11 px-4 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:bg-black/30 dark:text-white dark:placeholder:text-white/40 dark:border-white/10 dark:focus:ring-sky-500/50"
                disabled={submitting}
                autoComplete="new-password"
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={[
                "w-full h-11 rounded-lg font-semibold transition-colors",
                !canSubmit || submitting
                  ? "bg-slate-600 text-white/80 cursor-not-allowed"
                  : "bg-sky-500 text-white hover:bg-sky-400",
              ].join(" ")}
            >
              {submitting ? tr("처리 중...", "処理中...") : tr("회원가입", "会員登録")}
            </button>

            <div className="pt-2 text-center text-sm text-gray-600 dark:text-white/70">
              {tr("이미 계정이 있어요", "すでにアカウントがあります")}{" "}
              <Link href="/login" className="text-sky-600 hover:text-sky-700 underline dark:text-sky-300 dark:hover:text-sky-200">
                {tr("로그인", "ログイン")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
