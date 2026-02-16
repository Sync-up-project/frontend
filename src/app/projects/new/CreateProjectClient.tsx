// src/app/projects/new/CreateProjectClient.tsx
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";

type StackChip = { id: string; label: string };
type ToolChip = { id: string; label: string };

const STACKS: StackChip[] = [
  { id: "react", label: "React" },
  { id: "next", label: "Next.js" },
  { id: "ts", label: "TypeScript" },
  { id: "node", label: "Node.js" },
  { id: "ws", label: "WebSocket" },
  { id: "py", label: "Python" },
  { id: "tf", label: "TensorFlow" },
  { id: "rn", label: "React Native" },
];

const TOOLS: ToolChip[] = [
  { id: "notion", label: "Notion" },
  { id: "figma", label: "Figma" },
  { id: "miro", label: "Miro" },
  { id: "github", label: "GitHub" },
  { id: "jira", label: "Jira" },
];

type Position = "backend" | "frontend" | "fullstack" | "mobile" | "devops" | "data" | "ai";
const POSITION_OPTIONS: { value: Position; labelKr: string; labelJp: string }[] = [
  { value: "backend", labelKr: "백엔드", labelJp: "バックエンド" },
  { value: "frontend", labelKr: "프론트엔드", labelJp: "フロントエンド" },
  { value: "fullstack", labelKr: "풀스택", labelJp: "フルスタック" },
  { value: "mobile", labelKr: "모바일", labelJp: "モバイル" },
  { value: "devops", labelKr: "DevOps", labelJp: "DevOps" },
  { value: "data", labelKr: "데이터", labelJp: "データ" },
  { value: "ai", labelKr: "AI/ML", labelJp: "AI/ML" },
];

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function CreateProjectClient() {
  const { tr, lang } = useI18n();

  const [title, setTitle] = useState("");
  const [position, setPosition] = useState<Position>("backend");
  const [count, setCount] = useState<number>(5);
  const [dueDate, setDueDate] = useState<string>("");
  const [allowComment, setAllowComment] = useState(true);
  const [allowShare, setAllowShare] = useState(true);
  const [allowScrap, setAllowScrap] = useState(false);
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [body, setBody] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const positionLabel = useMemo(() => {
    const found = POSITION_OPTIONS.find((o) => o.value === position);
    if (!found) return "";
    return lang === "JP" ? found.labelJp : found.labelKr;
  }, [position, lang]);

  const placeholderTitle = useMemo(() => {
    return tr("예: 실시간 채팅 기반 협업 플랫폼 MVP 모집", "例：リアルタイムチャット型の協業プラットフォームMVP募集");
  }, [tr]);

  const placeholderCount = useMemo(() => tr("예: 5", "例：5"), [tr]);

  const placeholderBody = useMemo(() => {
    return tr(
      "- 프로젝트 소개:\n- 진행 방식(온라인/오프라인, 주당 일정):\n- 모집 역할:\n- 요구 경험/우대 사항:\n- 연락 방법:",
      "- プロジェクト概要：\n- 進行方法（オンライン／オフライン、週あたりの予定）：\n- 募集役割：\n- 必須経験／歓迎条件：\n- 連絡方法："
    );
  }, [tr]);

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function onSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMsg(null);

    try {
      if (!title.trim()) {
        setErrorMsg(tr("프로젝트명을 입력해 주세요.", "プロジェクト名を入力してください。"));
        return;
      }
      if (!dueDate) {
        setErrorMsg(tr("기한을 선택해 주세요.", "期限を選択してください。"));
        return;
      }

      // 더미 단계: 실제 API 연결 전까지는 콘솔 로그로만 확인
      // eslint-disable-next-line no-console
      console.log({
        title,
        position,
        count,
        dueDate,
        allowComment,
        allowShare,
        allowScrap,
        stacks: selectedStacks,
        tools: selectedTools,
        body,
      });

      // UX: 제출 후 projects로 이동
      window.location.href = "/projects";
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* ✅ 여기 간격 조정: mb-5 → mb-8 (요청사항) */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{tr("프로젝트 글쓰기", "プロジェクト投稿")}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {tr(
                "필수 정보를 입력한 뒤, 본문에서 프로젝트 소개 및 모집글을 자유롭게 작성해 주세요.",
                "必須情報を入力した後、本文でプロジェクト紹介と募集内容を自由に記入してください。"
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tr("취소", "キャンセル")}
            </Link>
            <button
              type="button"
              onClick={onSubmit}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              {tr("등록", "登録")}
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left */}
          <div className="space-y-6">
            <SectionCard title={tr("프로젝트명 (필수)", "プロジェクト名（必須）")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr("프로젝트를 한 줄로 설명하는 제목을 입력해 주세요.", "プロジェクトを一行で説明するタイトルを入力してください。")}
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={placeholderTitle}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </SectionCard>

            <SectionCard title={tr("모집유형 / 인원 / 기한 (필수)", "募集タイプ／人数／期限（必須）")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">{tr("모집유형", "募集タイプ")}</p>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900"
                  >
                    {positionLabel}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {POSITION_OPTIONS.map((o) => (
                      <ChipButton key={o.value} active={position === o.value} onClick={() => setPosition(o.value)}>
                        {lang === "JP" ? o.labelJp : o.labelKr}
                      </ChipButton>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">{tr("모집인원", "募集人数")}</p>
                  <input
                    value={Number.isFinite(count) ? String(count) : ""}
                    onChange={(e) => setCount(Number(e.target.value || 0))}
                    placeholder={placeholderCount}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">{tr("기한", "期限")}</p>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>

              {/* 구분선(요청하셨던 형태가 필요하면 여기서 유지/확장 가능) */}
              <div className="my-6 h-px w-full bg-gray-200" />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">{tr("개발언어/스택 (필수)", "開発言語／スタック（必須）")}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {tr("필요한 기술을 선택해 주세요(복수 선택).", "必要な技術を選択してください（複数選択可）。")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STACKS.map((s) => {
                      const active = selectedStacks.includes(s.id);
                      return (
                        <ChipButton
                          key={s.id}
                          active={active}
                          onClick={() => setSelectedStacks((prev) => toggleId(prev, s.id))}
                        >
                          {s.label}
                        </ChipButton>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">{tr("툴/협업도구 (필수)", "ツール／協業ツール（必須）")}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {tr("협업에 사용할 도구를 선택해 주세요(복수 선택).", "協業で使うツールを選択してください（複数選択可）。")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TOOLS.map((t) => {
                      const active = selectedTools.includes(t.id);
                      return (
                        <ChipButton
                          key={t.id}
                          active={active}
                          onClick={() => setSelectedTools((prev) => toggleId(prev, t.id))}
                        >
                          {t.label}
                        </ChipButton>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title={tr("본문 (자유 작성)", "本文（自由記入）")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr("프로젝트 소개, 진행 방식, 기대 역할, 연락 방법 등을 작성해 주세요.", "プロジェクト紹介、進行方式、期待役割、連絡方法などを記入してください。")}
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={placeholderBody}
                rows={10}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </SectionCard>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <SectionCard title={tr("공개 설정", "公開設定")}>
              <p className="text-xs text-gray-500 mb-4">
                {tr("백엔드 연동 중인 단계에서는 UI만 제공합니다.", "バックエンド連携中の段階では、UIのみ提供します。")}
              </p>

              <label className="flex items-center gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={allowComment}
                  onChange={(e) => setAllowComment(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {tr("댓글 허용", "コメント許可")}
              </label>

              <label className="mt-3 flex items-center gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={allowShare}
                  onChange={(e) => setAllowShare(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {tr("공유 허용", "共有許可")}
              </label>

              <label className="mt-3 flex items-center gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={allowScrap}
                  onChange={(e) => setAllowScrap(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                {tr("스크랩 허용", "スクラップ許可")}
              </label>
            </SectionCard>

            <SectionCard title={tr("작성 가이드", "作成ガイド")}>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
                <li>
                  {tr(
                    "진행 방식(온라인/오프라인), 주당 회의 빈도를 명확히 작성해 주세요.",
                    "進行方式（オンライン／オフライン）と週あたりの会議頻度を明確に記入してください。"
                  )}
                </li>
                <li>
                  {tr(
                    "모집 역할, 기대 역량, 우대 사항을 구분해 주세요.",
                    "募集役割、期待スキル、歓迎条件を区別して記入してください。"
                  )}
                </li>
                <li>
                  {tr(
                    "연락 방법(오픈채팅, 디스코드 등)과 응답 가능한 시간을 적어 주세요.",
                    "連絡方法（オープンチャット、Discordなど）と対応可能時間を記入してください。"
                  )}
                </li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
