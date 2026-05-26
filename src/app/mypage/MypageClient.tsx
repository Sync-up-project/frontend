"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { getAccessToken, fetchCurrentUser } from "@/lib/auth";
import { apiGetProjectsList, pickArray } from "@/lib/api";
import { alertAndGoLogin } from "@/lib/requireLogin";

type UserMe = {
  id: string;
  nickname?: string | null;
  email?: string | null;
  role?: string | null;
  country?: string | null;
  createdAt?: string | null;
  github?: {
    username?: string | null;
    connected?: boolean;
    url?: string | null;
  } | null;
};

type ProjectCard = {
  id: string;
  title: string;
  subtitle?: string;
  dateText?: string;
  statsText?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateKR(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}. ${m}. ${day}.`;
}

function initialsFromName(name?: string | null) {
  const s = (name ?? "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function normalizeRole(role?: string | null) {
  const r = String(role ?? "").toUpperCase();
  if (!r) return "개발자";
  if (r === "DEV" || r.includes("DEV") || r.includes("DEVELOPER")) return "개발자";
  if (r === "DESIGN" || r.includes("DESIGN")) return "디자이너";
  if (r === "PM" || r.includes("PM") || r.includes("PLAN")) return "기획";
  return String(role ?? "개발자");
}

function normalizeCountry(country?: string | null) {
  const c = (country ?? "").trim();
  if (!c) return "대한민국 (KR)";
  if (c === "country.korea" || c.toLowerCase() === "korea") return "대한민국 (KR)";
  return c;
}

function getOwnerIdFromProject(p: any): string | null {
  const candidates = [
    p?.ownerId,
    p?.leaderId,
    p?.creatorId,
    p?.createdById,
    p?.hostUserId,
    p?.userId,
    p?.owner?.id,
    p?.creator?.id,
    p?.createdBy?.id,
  ];

  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="text-xl font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="mt-1.5 text-xs font-semibold text-gray-700">{label}</div>
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm md:text-base font-extrabold text-gray-900">{title}</h2>
      {right}
    </div>
  );
}

function ProjectMiniCard({ p }: { p: ProjectCard }) {
  return (
    <Link
      href={`/projects/${encodeURIComponent(p.id)}`}
      className="block rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-gray-900 truncate">{p.title}</div>
          {p.subtitle ? <div className="mt-1 text-xs text-gray-600 line-clamp-2">{p.subtitle}</div> : null}
        </div>

        <span className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
          상세
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span>{p.statsText ?? "모집/참여 정보 없음"}</span>
        <span className="text-gray-300">·</span>
        <span>{p.dateText ?? "-"}</span>
      </div>
    </Link>
  );
}

function ActivityBars({ values }: { values: number[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold text-gray-900">최근 활동 패턴 (최근 30일)</div>
        <div className="text-[11px] text-gray-500">30일 전 → 오늘</div>
      </div>

      <div className="mt-2.5 flex items-end gap-1">
        {values.map((v, i) => {
          const h = 5 + v * 8;
          return (
            <div
              key={i}
              className={cn(
                "w-2 rounded-md",
                v === 0
                  ? "bg-gray-200"
                  : v === 1
                  ? "bg-green-200"
                  : v === 2
                  ? "bg-green-300"
                  : v === 3
                  ? "bg-green-400"
                  : "bg-green-500"
              )}
              style={{ height: `${h}px` }}
              aria-label={`day-${i}-${v}`}
            />
          );
        })}
      </div>

      <div className="mt-2.5">
        <Link href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700">
          GitHub 프로필 보기 →
        </Link>
      </div>
    </div>
  );
}

export default function MypageClient() {
  const { tr } = useI18n();
  const router = useRouter();

  const [me, setMe] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myCreatedProjects, setMyCreatedProjects] = useState<ProjectCard[]>([]);
  const [myAppliedProjects] = useState<ProjectCard[]>([]);

  const githubStats = useMemo(
    () => ({
      totalCommits: 0,
      publicRepos: 0,
      last7days: 0,
      last30days: 0,
    }),
    []
  );

  const counters = useMemo(() => {
    return {
      created: myCreatedProjects.length,
      applied: myAppliedProjects.length,
      pending: 0,
      accepted: 0,
    };
  }, [myCreatedProjects.length, myAppliedProjects.length]);

  const activityValues = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => (i % 9 === 0 ? 3 : i % 7 === 0 ? 2 : 0));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setErrorMsg(null);

      const token = getAccessToken();
      if (!token) {
        if (!mounted) return;
        alertAndGoLogin(router, tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
        return;
      }

      try {
        const user = await fetchCurrentUser();
        const built: UserMe = {
          id: String(user.id),
          nickname: user.nickname ?? "User",
          email: user.email ?? "-",
          role: user.role ?? "DEV",
          country: (user as any)?.country ?? null,
          createdAt: (user as any)?.createdAt ?? null,
          github: (user as any)?.github ?? null,
        };

        const listRes = await apiGetProjectsList();
        const all = pickArray<any>(listRes);

        const myId = String(built.id);
        const mine = all.filter((p) => {
          const ownerId = getOwnerIdFromProject(p);
          return ownerId ? String(ownerId) === myId : false;
        });

        const mapped: ProjectCard[] = mine.map((p) => ({
          id: String(p?.id ?? ""),
          title: String(p?.titleOriginal ?? p?.title ?? "-"),
          subtitle: String(p?.summaryOriginal ?? p?.summary ?? p?.description ?? ""),
          dateText: formatDateKR(p?.createdAt ?? null),
          statsText: `모집정원: ${Number(p?.capacity ?? 0) || 0}명`,
        }));

        if (!mounted) return;
        setMe(built);
        setMyCreatedProjects(mapped);
      } catch (e: any) {
        if (!mounted) return;
        setErrorMsg(e?.message ?? "마이페이지 데이터를 불러오지 못했습니다.");
        setMe(null);
        setMyCreatedProjects([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router, tr]);

  const nickname = me?.nickname ?? "User";
  const email = me?.email ?? "-";
  const role = normalizeRole(me?.role);
  const country = normalizeCountry(me?.country);
  const joined = formatDateKR(me?.createdAt);

  const ghConnected = Boolean(me?.github?.connected);
  const ghUsername = ghConnected ? me?.github?.username ?? tr("알 수 없음", "不明") : tr("미연동", "未連携");
  const ghUrl =
    ghConnected && me?.github?.url
      ? me.github.url
      : ghConnected && me?.github?.username
      ? `https://github.com/${me.github.username}`
      : "#";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="mt-2">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{tr("마이페이지", "マイページ")}</h1>
        </div>

        {errorMsg ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-sm dark:bg-white/5 dark:border-red-500/30 dark:text-red-200">
            {tr("마이페이지 데이터를 불러오지 못했습니다.", "読み込みに失敗しました。")}
            <div className="mt-1 text-xs text-red-600 dark:text-red-200/80 break-words">{errorMsg}</div>
          </div>
        ) : null}

        <div className="mt-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm">
                {initialsFromName(nickname)}
              </div>

              <div>
                <div className="text-sm md:text-base font-extrabold text-gray-900 dark:text-white">
                  {tr("프로필 정보", "プロフィール")}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-white/60">
                  {loading
                    ? tr("불러오는 중...", "読み込み中...")
                    : tr("계정 정보를 확인하고 수정할 수 있습니다.", "アカウント情報を確認・編集できます。")}
                </div>
              </div>
            </div>

            <Link
              href="/mypage/edit"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-500 transition-colors"
            >
              {tr("프로필 수정", "編集")}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
              <div className="text-[11px] font-bold text-gray-500 dark:text-white/60">{tr("닉네임", "ニックネーム")}</div>
              <div className="mt-1.5 text-sm font-extrabold text-gray-900 dark:text-white break-words">{nickname}</div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
              <div className="text-[11px] font-bold text-gray-500 dark:text-white/60">{tr("이메일", "メール")}</div>
              <div className="mt-1.5 text-sm font-extrabold text-gray-900 dark:text-white break-words">{email}</div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
              <div className="text-[11px] font-bold text-gray-500 dark:text-white/60">{tr("역할", "役割")}</div>
              <div className="mt-1.5 text-sm font-extrabold text-gray-900 dark:text-white">{role}</div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-3 dark:bg-white/5">
              <div className="text-[11px] font-bold text-gray-500 dark:text-white/60">{tr("국가", "国")}</div>
              <div className="mt-1.5 text-sm font-extrabold text-gray-900 dark:text-white">{country}</div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-3 md:col-span-2 dark:bg-white/5">
              <div className="text-[11px] font-bold text-gray-500 dark:text-white/60">{tr("가입일", "登録日")}</div>
              <div className="mt-1.5 text-sm font-extrabold text-gray-900 dark:text-white">{joined}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-3.5 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-gray-900 dark:text-white">{tr("GitHub 연동", "GitHub 連携")}</div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {ghConnected
                    ? tr("GitHub 계정이 연동되어 있습니다.", "GitHub アカウントが連携されています。")
                    : tr("GitHub 계정을 연동하면 통계를 표시할 수 있습니다.", "連携すると統計を表示できます。")}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-black text-xs">
                    GH
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-gray-900 truncate">
                      {ghConnected ? ghUsername : tr("미연동", "未連携")}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">{ghConnected ? `github.com/${ghUsername}` : "-"}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold",
                    ghConnected ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                  )}
                >
                  {ghConnected ? tr("연동됨", "連携済み") : tr("미연동", "未連携")}
                </span>

                <Link
                  href={ghConnected ? ghUrl : "/auth/github"}
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-[11px] font-extrabold transition-colors",
                    ghConnected
                      ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  )}
                >
                  {ghConnected ? tr("GitHub 보기", "GitHubを見る") : tr("연동하기", "連携하기")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SectionTitle title={tr("GitHub 활동 통계", "GitHub 統計")} />
          <div className="mt-2 grid grid-cols-1 gap-2.5 md:grid-cols-4">
            <StatCard value={githubStats.totalCommits} label={tr("총 커밋 수", "総コミット")} />
            <StatCard value={githubStats.publicRepos} label={tr("Public 저장소", "Public リポジトリ")} />
            <StatCard value={githubStats.last7days} label={tr("최근 1주일", "直近7日")} />
            <StatCard value={githubStats.last30days} label={tr("최근 1개월", "直近30日")} />
          </div>

          <div className="mt-2">
            <ActivityBars values={activityValues} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2.5 md:grid-cols-4">
          <StatCard value={counters.created} label={tr("생성한 프로젝트", "作成したプロジェクト")} />
          <StatCard value={counters.applied} label={tr("신청한 프로젝트", "申請したプロジェクト")} />
          <StatCard value={counters.pending} label={tr("대기 중인 신청", "保留中")} />
          <StatCard value={counters.accepted} label={tr("수락된 신청", "承認")} />
        </div>

        <div className="mt-6">
          <SectionTitle
            title={`${tr("내가 생성한 프로젝트", "作成したプロジェクト")} (${myCreatedProjects.length})`}
            right={
              <Link
                href="/projects/create"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-500 transition-colors"
              >
                {tr("프로젝트 생성", "作成")}
              </Link>
            }
          />

          <div className="mt-2 grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                {tr("불러오는 중...", "読み込み中...")}
              </div>
            ) : myCreatedProjects.length > 0 ? (
              myCreatedProjects.map((p) => <ProjectMiniCard key={p.id} p={p} />)
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                {tr("생성한 프로젝트가 없습니다.", "作成したプロジェクトはありません。")}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <SectionTitle title={`${tr("내가 신청한 프로젝트", "申請したプロジェクト")} (${myAppliedProjects.length})`} />

          <div className="mt-2">
            {myAppliedProjects.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {myAppliedProjects.map((p) => (
                  <ProjectMiniCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm text-center">
                {tr("참여 신청한 프로젝트가 없습니다.", "参加申請したプロジェクトはありません。")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
