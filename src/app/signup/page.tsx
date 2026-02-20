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

  // ✅ role은 UI에 남겨두되, 백엔드 signup 스펙에 없어서 제출 조건에 포함하지 않음
  const [selectedRole, setSelectedRole] = useState<string>("");

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
              {tr("프로젝트가 시작되는 곳", "プロジェクトが始まる場所")}
              <br />
              <span className="text-gray-900">Sync Up</span>
            </h1>

            <p className="text-gray-700 leading-relaxed max-w-md">
              {tr(
                "이메일 인증 없이 간단하게 회원가입을 진행합니다. (추후 이메일 인증을 다시 추가할 수 있습니다.)",
                "メール認証なしで簡単に会員登録を進めます。（後でメール認証を追加できます。）"
              )}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 w-full md:w-[520px] md:min-w-[520px] md:max-w-[520px] justify-self-end border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {tr("Sync Up 회원가입", "Sync Up 会員登録")}
            </h2>

            <form className="space-y-4" onSubmit={onSubmit}>
              {/* Role (UI만 유지) */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {tr("역할 선택(선택)", "役割選択（任意）")}
                </label>
                <div className="flex gap-2">
                  {[
                    { key: "DEV", label: tr("개발", "開発") },
                    { key: "DESIGN", label: tr("디자인", "デザイン") },
                    { key: "PM", label: tr("기획", "企画") },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setSelectedRole(r.key)}
                      className={[
                        "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                        selectedRole === r.key
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {tr(
                    "현재 회원가입 API에 role이 포함되어 있지 않아 저장되지 않습니다.",
                    "現在の会員登録APIにroleが含まれていないため保存されません。"
                  )}
                </p>
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
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
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={onCheckNickname}
                    className="px-4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium"
                  >
                    {tr("중복확인", "重複確認")}
                  </button>
                </div>

                {nicknameMsg ? (
                  <p
                    className={[
                      "mt-2 text-sm",
                      nicknameChecked === "ok" ? "text-emerald-700" : "text-red-700",
                    ].join(" ")}
                  >
                    {nicknameMsg}
                  </p>
                ) : null}
              </div>

              {/* Email (이메일 인증 제거: 입력만 받음) */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {tr("이메일", "メール")}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  placeholder={tr("이메일을 입력해 주세요", "メールアドレスを入力してください")}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                />
                {!email.trim() ? null : isValidEmail(email.trim()) ? (
                  <p className="mt-2 text-sm text-emerald-700">
                    {tr("사용 가능한 이메일 형식입니다.", "使用可能なメール形式です。")}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-red-700">
                    {tr("이메일 형식을 확인해 주세요.", "メールアドレスの形式をご確認ください。")}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {tr("비밀번호", "パスワード")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tr("비밀번호를 입력해 주세요 (8자 이상)", "パスワードを入力してください（8文字以上）")}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {tr("비밀번호 확인", "パスワード確認")}
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={tr("비밀번호를 다시 입력해 주세요", "パスワードをもう一度入力してください")}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
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
                {submitting ? tr("처리 중...", "処理中...") : tr("회원가입", "会員登録")}
              </button>

              <Link
                href="/login"
                className="block w-full py-3 bg-white text-gray-900 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors text-center font-medium"
              >
                {tr("이미 계정이 있어요", "すでにアカウントがあります")}
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
