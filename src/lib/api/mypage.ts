import type {
  MyPageResponse,
  UpdateMyPageBody,
  GithubStatsResponse,
  ProjectSummaryResponse,
  CreatedProjectsResponse,
  AppliedProjectsResponse,
} from "@/lib/types/mypage";

import { fetchCurrentUser } from "@/lib/auth";

import {
  mockGithubStats,
  mockProjectSummary,
  mockCreatedProjects,
  mockAppliedProjects,
} from "@/mocks/mypage";

const USE_MOCK_FOR_NON_USER_SECTIONS = true;

function pickString(v: any): string {
  return typeof v === "string" ? v : "";
}

function normalizeUserForMyPage(meAny: any): MyPageResponse {
  // fetchCurrentUser()는 SessionUser를 리턴하지만, 혹시 형태가 바뀌어도 방어적으로 처리
  const u = meAny?.user ?? meAny ?? {};

  const githubObj = u.github ?? {};
  const githubUsername = pickString(githubObj.username) || pickString(u.githubUsername);
  const githubUrl = pickString(githubObj.url) || pickString(u.githubUrl);
  const isConnected =
    Boolean(githubObj.isConnected) || Boolean(githubUsername) || Boolean(githubUrl);

  const profileImageUrl =
    pickString(u.profileImageUrl) ||
    pickString(githubObj.avatarUrl) ||
    pickString(u.githubAvatarUrl) ||
    "";

  return {
    user: {
      id: pickString(u.id),
      nickname: pickString(u.nickname) || pickString(u.name) || pickString(u.username),
      email: pickString(u.email),
      role: (pickString(u.role) as any) || "DEV",
      primaryLanguage: (pickString(u.primaryLanguage) as any) || "KO",
      createdAt: pickString(u.createdAt) || new Date().toISOString(),
      bio: pickString(u.bio),
      profileImageUrl,
      github: {
        isConnected,
        username: githubUsername,
        url: githubUrl,
      },
    },
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function apiGetMyPage(): Promise<MyPageResponse> {
  // ✅ "유저"는 무조건 백엔드(/auth/me) 기준
  const me = await fetchCurrentUser();
  return normalizeUserForMyPage(me);
}

export async function apiPatchMyPage(body: UpdateMyPageBody): Promise<MyPageResponse> {
  // 백엔드 mypage PATCH가 아직이라면 일단 프론트에서만 반영하지 말고
  // 최신 /auth/me 기반으로 유지합니다.
  // (mypage PATCH 붙으면 여기에서 실제 PATCH 호출로 교체)
  await delay(100);
  return apiGetMyPage();
}

export async function apiGetGithubStats(): Promise<GithubStatsResponse> {
  if (USE_MOCK_FOR_NON_USER_SECTIONS) {
    await delay(150);
    return structuredClone(mockGithubStats);
  }
  throw new Error("Not implemented");
}

export async function apiGetProjectSummary(): Promise<ProjectSummaryResponse> {
  if (USE_MOCK_FOR_NON_USER_SECTIONS) {
    await delay(150);
    return structuredClone(mockProjectSummary);
  }
  throw new Error("Not implemented");
}

export async function apiGetCreatedProjects(
  page = 1,
  size = 10
): Promise<CreatedProjectsResponse> {
  if (USE_MOCK_FOR_NON_USER_SECTIONS) {
    await delay(150);
    return { ...structuredClone(mockCreatedProjects), page, size };
  }
  throw new Error("Not implemented");
}

export async function apiGetAppliedProjects(): Promise<AppliedProjectsResponse> {
  if (USE_MOCK_FOR_NON_USER_SECTIONS) {
    await delay(150);
    return structuredClone(mockAppliedProjects);
  }
  throw new Error("Not implemented");
}