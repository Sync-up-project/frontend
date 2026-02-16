// src/app/mypage/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/auth";
import {
  apiGetMyPage,
  apiGetMyPageGithubStats,
  apiGetMyPageProjectsSummary,
  apiGetMyPageProjectsCreated,
  apiGetMyPageProjectsApplied,
  apiGetUsersMyPage,
  apiPatchMyPage,
  apiPatchUsersMyPage,
} from "@/lib/api";

import type {
  GetMyPageResponse,
  GetMyPageGithubStatsResponse,
  GetMyPageProjectsSummaryResponse,
  GetMyPageProjectsCreatedResponse,
  GetMyPageProjectsAppliedResponse,
  GetUsersMyPageResponse,
  PatchMyPageRequest,
  PatchUsersMyPageRequest,
} from "@/lib/types/mypage";

type TabKey = "overview" | "edit";

function initials(name: string) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export default function MyPage() {
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("overview");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // data states
  const [me, setMe] = useState<GetMyPageResponse["user"] | null>(null);
  const [stacks, setStacks] = useState<string[]>([]);
  const [githubStats, setGithubStats] = useState<GetMyPageGithubStatsResponse["stats"] | null>(null);
  const [summary, setSummary] = useState<GetMyPageProjectsSummaryResponse["summary"] | null>(null);
  const [created, setCreated] = useState<GetMyPageProjectsCreatedResponse | null>(null);
  const [applied, setApplied] = useState<GetMyPageProjectsAppliedResponse | null>(null);

  // edit form
  const [formNickname, setFormNickname] = useState("");
  const [formPrimaryLanguage, setFormPrimaryLanguage] = useState<"KO" | "JA" | "EN" | string>("KO");
  const [formBio, setFormBio] = useState("");
  const [formProfileImageUrl, setFormProfileImageUrl] = useState(""); // 스펙상 string
  // stacks는 /users/mypage에서 내려오지만 patch 스펙이 없어서 일단 read-only로 둡니다.

  const displayName = me?.nickname ?? "User";
  const avatarText = initials(displayName);

  const dirty = useMemo(() => {
    if (!me) return false;
    return (
      formNickname.trim() !== (me.nickname ?? "") ||
      formPrimaryLanguage !== (me.primaryLanguage ?? "KO") ||
      formBio.trim() !== "" || // 백엔드에서 bio GET 스펙이 없어서 비교 불가(입력 여부만 체크)
      formProfileImageUrl.trim() !== "" // 동일
    );
  }, [me, formNickname, formPrimaryLanguage, formBio, formProfileImageUrl]);

  function syncFormFromLoadedUser(u: GetMyPageResponse["user"]) {
    setFormNickname(u.nickname ?? "");
    setFormPrimaryLanguage(u.primaryLanguage ?? "KO");
    // GET /mypage 응답에 bio/profileImageUrl이 없어서 기본값 유지
    setFormBio("");
    setFormProfileImageUrl("");
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      // 병렬 호출 (필요한 것만)
      const [
        mypageRes,
        usersMypageRes,
        githubRes,
        summaryRes,
        createdRes,
        appliedRes,
      ] = await Promise.all([
        apiGetMyPage(), // GET /mypage
        apiGetUsersMyPage().catch(() => null), // GET /users/mypage (stacks)
        apiGetMyPageGithubStats().catch(() => null), // GET /mypage/github/stats
        apiGetMyPageProjectsSummary().catch(() => null), // GET /mypage/projects/summary
        apiGetMyPageProjectsCreated({ page: 1, size: 10 }).catch(() => null), // GET /mypage/projects/created
        apiGetMyPageProjectsApplied().catch(() => null), // GET /mypage/projects/applied
      ]);

      setMe(mypageRes.user);
      syncFormFromLoadedUser(mypageRes.user);

      const um = usersMypageRes as GetUsersMyPageResponse | null;
      setStacks(Array.isArray(um?.stacks) ? um!.stacks : []);

      setGithubStats((githubRes as GetMyPageGithubStatsResponse | null)?.stats ?? null);
      setSummary((summaryRes as GetMyPageProjectsSummaryResponse | null)?.summary ?? null);
      setCreated((createdRes as GetMyPageProjectsCreatedResponse | null) ?? null);
      setApplied((appliedRes as GetMyPageProjectsAppliedResponse | null) ?? null);
    } catch (e: any) {
      setError(e?.message ?? "마이페이지 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    if (!me) return;

    setSaving(true);
    setError(null);

    try {
      // 1) PATCH /mypage
      const body1: PatchMyPageRequest = {
        nickname: formNickname.trim() || me.nickname,
        profileImageUrl: formProfileImageUrl.trim() || "", // 스펙상 string
        bio: formBio.trim() || "",
        primaryLanguage: formPrimaryLanguage,
      };

      // 2) PATCH /users/mypage (닉네임만)
      // id가 number로 내려오는 스펙이 있어 Number로 강제 변환
      const numericId = typeof me.id === "number" ? me.id : Number(me.id);
      const body2: PatchUsersMyPageRequest = {
        id: Number.isFinite(numericId) ? numericId : 0,
        nickname: body1.nickname,
      };

      // body2.id가 0이면 백엔드가 싫어할 수 있어요 -> 그 경우엔 users/mypage PATCH를 건너뜁니다.
      const calls: Promise<any>[] = [apiPatchMyPage(body1)];
      if (body2.id > 0) calls.push(apiPatchUsersMyPage(body2));

      await Promise.all(calls);

      // 다시 로드해서 화면 동기화
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      setError(e?.message ?? "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topStats = useMemo(() => {
    // summary 없으면 0으로 표시
    const s = summary ?? {
      createdProjects: 0,
      appliedProjects: 0,
      pendingApplications: 0,
      acceptedApplications: 0,
    };

    return [
      { label: "생성한 프로젝트", value: s.createdProjects },
      { label: "지원한 프로젝트", value: s.appliedProjects },
      { label: "대기중", value: s.pendingApplications },
      { label: "수락됨", value: s.acceptedApplications },
    ];
  }, [summary]);

  return (
    <div className="min-h-screen -mt-20 pt-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
            <p className="text-sm text-gray-600 mt-1">계정 정보와 활동 내역을 확인하고 프로필을 수정합니다.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className={[
                "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                tab === "overview"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              마이페이지
            </button>
            <button
              type="button"
              onClick={() => setTab("edit")}
              className={[
                "px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                tab === "edit"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              프로필 수정
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-white border border-red-100 rounded-2xl p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadAll}
              className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            불러오는 중...
          </div>
        ) : tab === "overview" ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {avatarText}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 border border-gray-200 text-gray-700">
                          {me?.primaryLanguage ?? "KO"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{me?.email ?? "-"}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{me?.role ?? "역할 정보 없음"}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {stacks.slice(0, 8).map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2.5 py-1 rounded-full bg-white/70 border border-gray-200 text-gray-700"
                      >
                        {s}
                      </span>
                    ))}
                    {stacks.length === 0 && <span className="text-xs text-gray-500">기술 스택이 비어 있습니다.</span>}
                  </div>

                  <div className="mt-4 text-xs text-gray-600">
                    GitHub:{" "}
                    {me?.github?.isConnected ? (
                      <a className="text-emerald-700 hover:underline" href={me.github.url} target="_blank" rel="noreferrer">
                        연결됨
                      </a>
                    ) : (
                      <span className="text-gray-700">미연결</span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <button
                    type="button"
                    onClick={() => setTab("edit")}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
                  >
                    프로필 수정
                  </button>
                </div>
              </div>

              {/* GitHub stats */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="font-semibold text-gray-900">GitHub 통계</p>
                {!githubStats ? (
                  <p className="mt-2 text-sm text-gray-600">통계 정보가 없습니다.</p>
                ) : (
                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>총 커밋</span>
                      <span className="font-semibold">{githubStats.totalCommits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>공개 레포</span>
                      <span className="font-semibold">{githubStats.publicRepos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>최근 1주</span>
                      <span className="font-semibold">{githubStats.recent1Week}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>최근 1달</span>
                      <span className="font-semibold">{githubStats.recent1Month}</span>
                    </div>

                    <div className="pt-3">
                      <p className="text-xs text-gray-500">Top Languages</p>
                      <div className="mt-2 space-y-1">
                        {githubStats.topLangs.map((l) => (
                          <div key={l.name} className="flex justify-between">
                            <span>{l.name}</span>
                            <span className="font-semibold">{l.percent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main */}
            <div className="lg:col-span-8 space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topStats.map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Created projects */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">내가 만든 프로젝트</p>
                  <p className="text-xs text-gray-500">
                    {created ? `총 ${created.total}개` : ""}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {(created?.items ?? []).map((p) => (
                    <div key={p.id} className="rounded-xl border border-gray-100 p-4 bg-gray-50/40">
                      <p className="font-semibold text-gray-900">{p.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{p.summary}</p>
                      <div className="mt-2 text-xs text-gray-600 flex gap-3">
                        <span>지원: {p.counts.applications}</span>
                        <span>채용: {p.counts.hired}</span>
                        <span>작성일: {new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {(created?.items?.length ?? 0) === 0 && (
                    <p className="text-sm text-gray-600">아직 만든 프로젝트가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* Applied projects */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="font-semibold text-gray-900">내가 지원한 프로젝트</p>

                <div className="mt-4 space-y-3">
                  {(applied?.items ?? []).map((p) => (
                    <div key={p.projectId} className="rounded-xl border border-gray-100 p-4 bg-gray-50/40">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{p.title}</p>
                        <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700">
                          {p.myStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{p.summary}</p>
                      <p className="mt-2 text-xs text-gray-600">
                        지원일: {new Date(p.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {(applied?.items?.length ?? 0) === 0 && (
                    <p className="text-sm text-gray-600">아직 지원한 프로젝트가 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // EDIT
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900">프로필 수정</h2>
            <p className="text-sm text-gray-600 mt-1">
              닉네임/언어/소개를 수정할 수 있습니다.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="닉네임">
                <input
                  value={formNickname}
                  onChange={(e) => setFormNickname(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900"
                />
              </Field>

              <Field label="Primary Language">
                <select
                  value={formPrimaryLanguage}
                  onChange={(e) => setFormPrimaryLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900"
                >
                  <option value="KO">KO</option>
                  <option value="JA">JA</option>
                  <option value="EN">EN</option>
                </select>
              </Field>

              <Field label="Profile Image URL (선택)">
                <input
                  value={formProfileImageUrl}
                  onChange={(e) => setFormProfileImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900"
                />
              </Field>

              <Field label="Bio (선택)" full>
                <textarea
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900"
                />
              </Field>

              <Field label="기술 스택(읽기 전용)" full>
                <div className="flex flex-wrap gap-2">
                  {stacks.map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                      {s}
                    </span>
                  ))}
                  {stacks.length === 0 && <span className="text-sm text-gray-600">등록된 스택이 없습니다.</span>}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  현재 스펙에 stacks 수정 API가 없어서, 스택 수정은 백엔드 확정 후 연결됩니다.
                </p>
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTab("overview")}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!dirty || saving}
                className={[
                  "px-4 py-2.5 rounded-xl text-white font-medium transition-colors",
                  !dirty || saving ? "bg-gray-300 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-800",
                ].join(" ")}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
