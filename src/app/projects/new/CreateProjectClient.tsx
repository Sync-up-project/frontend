// src/app/projects/new/CreateProjectClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { fetchCurrentUser, getAccessToken, getCurrentUser, saveCurrentUser } from "@/lib/auth";

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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:bg-white/5 dark:border-white/10">
      <div className="mb-4">
        <p className="text-sm font-extrabold text-gray-900 dark:text-white">{title}</p>
      </div>
      {children}
    </div>
  );
}

function mapStacksToLabels(ids: string[]) {
  const map = new Map(STACKS.map((s) => [s.id, s.label]));
  return ids.map((id) => map.get(id) ?? id).filter(Boolean);
}

/**
 * 기존 리스트 화면의 필터 매핑이 DEV/DESIGN 기반이라 우선 그 흐름을 유지합니다.
 * - backend -> DEV
 * - frontend -> DESIGN
 * - fullstack -> DEV + DESIGN
 * - 나머지는 일단 대문자 문자열로 전달(백엔드가 string으로 받는 구조라면 문제 없음)
 */
function mapPositionNeeds(position: Position) {
  if (position === "backend") return [{ position: "DEV", headcount: 1 }];
  if (position === "frontend") return [{ position: "DESIGN", headcount: 1 }];
  if (position === "fullstack")
    return [
      { position: "DEV", headcount: 1 },
      { position: "DESIGN", headcount: 1 },
    ];
  if (position === "mobile") return [{ position: "MOBILE", headcount: 1 }];
  if (position === "devops") return [{ position: "DEVOPS", headcount: 1 }];
  if (position === "data") return [{ position: "DATA", headcount: 1 }];
  return [{ position: "AI", headcount: 1 }];
}

async function postCreateProject(payload: any) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      (typeof data === "string" && data) ||
      `프로젝트 생성 실패 (HTTP ${res.status})`;
    throw new Error(String(msg));
  }

  return data;
}

export default function CreateProjectClient() {
  const router = useRouter();
  const { tr, lang } = useI18n();

  // ✅ 비로그인 직접 접근 차단: 알림 → 로그인 이동
  useEffect(() => {
    if (!getAccessToken()) {
      alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
      router.replace("/login");
    }
  }, [router, tr]);

  const [title, setTitle] = useState("");
  const [position, setPosition] = useState<Position>("backend");
  const [count, setCount] = useState<number>(5);
  const [recruitDeadline, setRecruitDeadline] = useState<string>("");
  const [projectEndDate, setProjectEndDate] = useState<string>("");
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
    return tr(
      "예: 실시간 채팅 기반 협업 플랫폼 MVP 모집",
      "例：リアルタイムチャット型の協業プラットフォームMVP募集"
    );
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
      // ✅ 클릭 시점에서도 비로그인 방어
      if (!getAccessToken()) {
        alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
        router.replace("/login");
        return;
      }

      if (!title.trim()) {
        setErrorMsg(tr("프로젝트명을 입력해 주세요.", "プロジェクト名を入力してください。"));
        return;
      }
      if (!recruitDeadline) {
        setErrorMsg(tr("모집 마감일을 선택해 주세요.", "募集締切を選択してください。"));
        return;
      }
      if (!projectEndDate) {
        setErrorMsg(
          tr("프로젝트 마감일을 선택해 주세요.", "プロジェクト終了日を選択してください。")
        );
        return;
      }

      let me = getCurrentUser();
      if (!me?.id) {
        try {
          me = await fetchCurrentUser();
          if (me) saveCurrentUser(me);
        } catch {
          // ignore
        }
      }
      if (!me?.id) {
        // 토큰은 있지만 유저 캐시가 없을 수도 있으므로: 동일 메시지로 처리
        alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
        router.replace("/login");
        return;
      }

      const techStacks = mapStacksToLabels(selectedStacks);

      const selectedToolLabels = TOOLS.filter((t) => selectedTools.includes(t.id)).map(
        (t) => t.label
      );
      const details = [
        body.trim(),
        selectedToolLabels.length > 0
          ? `${tr("협업 도구", "協業ツール")}: ${selectedToolLabels.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const summaryOriginal = details.trim()
        ? details.trim().split("\n")[0].slice(0, 120)
        : "";

      // ✅ 백엔드 POST /projects에 맞춘 payload
      const payload = {
        ownerId: String(me.id), // (인증 붙이면 서버에서 userId 추출하도록 변경)
        originalLang: lang === "JP" ? "JA" : "KO",
        titleOriginal: title.trim(),
        summaryOriginal,
        descriptionOriginal: details,
        mode: "ONLINE",
        difficulty: "MEDIUM",
        capacity: Number.isFinite(count) ? Number(count) : 1,
        endDate: projectEndDate ? new Date(projectEndDate).toISOString() : null,
        deadline: recruitDeadline ? new Date(recruitDeadline).toISOString() : null,
        techStacks,
        positionNeeds: mapPositionNeeds(position),
        // 아래 옵션들은 현재 백엔드 스키마에 없을 가능성이 높아서 일단 전송하지 않습니다.
        // TODO: 게시 옵션/협업도구를 저장하려면 스키마/백엔드부터 확장하세요.
      };

      await postCreateProject(payload);

      // ✅ 생성 성공 → 목록으로 이동
      router.push("/projects");
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e?.message ?? tr("생성에 실패했습니다.", "作成に失敗しました。"));
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {tr("프로젝트 글쓰기", "プロジェクト投稿")}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-white/70">
              {tr(
                "필수 정보를 입력한 뒤, 본문에서 프로젝트 소개 및 모집글을 자유롭게 작성해 주세요.",
                "必須情報を入力した後、本文でプロジェクト紹介と募集内容を自由に記入してください。"
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
            >
              {tr("취소", "キャンセル")}
            </Link>
            <button
              type="button"
              onClick={onSubmit}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
            >
              {tr("등록", "登録")}
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left */}
          <div className="space-y-6">
            <SectionCard title={tr("프로젝트명 (필수)", "プロジェクト名（必須）")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr(
                  "프로젝트를 한 줄로 설명하는 제목을 입력해 주세요.",
                  "プロジェクトを一行で説明するタイトルを入力してください。"
                )}
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={placeholderTitle}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </SectionCard>

            <SectionCard title={tr("본문", "本文")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr(
                  "프로젝트 소개 및 모집글을 자유롭게 작성해 주세요.",
                  "プロジェクト紹介と募集内容を自由に記入してください。"
                )}
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={placeholderBody}
                rows={14}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </SectionCard>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <SectionCard title={tr("모집 포지션", "募集ポジション")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr("주요 모집 포지션을 선택해 주세요.", "主な募集ポジションを選択してください。")}
              </p>

              <div className="flex flex-wrap gap-2">
                {POSITION_OPTIONS.map((o) => (
                  <ChipButton
                    key={o.value}
                    active={position === o.value}
                    onClick={() => setPosition(o.value)}
                  >
                    {lang === "JP" ? o.labelJp : o.labelKr}
                  </ChipButton>
                ))}
              </div>

              <div className="mt-3 text-xs text-gray-600">
                {tr("선택됨:", "選択:")}{" "}
                <span className="font-semibold text-gray-900">{positionLabel}</span>
              </div>
            </SectionCard>

            <SectionCard title={tr("모집 인원", "募集人数")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr("총 모집 인원을 입력해 주세요.", "募集人数を入力してください。")}
              </p>

              <input
                type="number"
                value={Number.isFinite(count) ? String(count) : ""}
                onChange={(e) => setCount(Number(e.target.value))}
                placeholder={placeholderCount}
                min={1}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </SectionCard>

            <SectionCard title={tr("모집 마감일 (필수)", "募集締切（必須）")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr(
                  "지원/모집을 받을 마감 날짜를 선택해 주세요.",
                  "募集を締め切る日を選択してください。"
                )}
              </p>

              <input
                type="date"
                value={recruitDeadline}
                onChange={(e) => setRecruitDeadline(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </SectionCard>

            <SectionCard title={tr("프로젝트 마감일 (필수)", "プロジェクト締切（必須）")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr(
                  "프로젝트 진행이 종료되는 목표 날짜를 선택해 주세요.",
                  "プロジェクト終了予定日を選択してください。"
                )}
              </p>

              <input
                type="date"
                value={projectEndDate}
                onChange={(e) => setProjectEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </SectionCard>

            <SectionCard title={tr("기술 스택", "技術スタック")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr("프로젝트에 사용할 스택을 선택해 주세요.", "使用するスタックを選択してください。")}
              </p>

              <div className="flex flex-wrap gap-2">
                {STACKS.map((s) => (
                  <ChipButton
                    key={s.id}
                    active={selectedStacks.includes(s.id)}
                    onClick={() => setSelectedStacks((prev) => toggleId(prev, s.id))}
                  >
                    {s.label}
                  </ChipButton>
                ))}
              </div>
            </SectionCard>

            <SectionCard title={tr("협업 도구", "協業ツール")}>
              <p className="text-xs text-gray-500 mb-3">
                {tr("협업 도구를 선택해 주세요.", "協業ツールを選択してください。")}
              </p>

              <div className="flex flex-wrap gap-2">
                {TOOLS.map((t) => (
                  <ChipButton
                    key={t.id}
                    active={selectedTools.includes(t.id)}
                    onClick={() => setSelectedTools((prev) => toggleId(prev, t.id))}
                  >
                    {t.label}
                  </ChipButton>
                ))}
              </div>
            </SectionCard>

            {/* 게시 옵션(댓글/공유/스크랩)은 현재 백엔드/스키마에 연결되지 않아 1차 MVP에서는 제거합니다. */}
          </div>
        </div>
      </div>
    </div>
  );
}
