// src/lib/api.ts

import { getAccessToken, getApiBaseUrl } from "@/lib/auth";

import type {
  ProjectListResponse,
  ProjectRecommendResponse,
  ProjectWishlistResponse,
  ProjectManagementResponse,
  ProjectDetailResponse,
  ProjectSimilarResponse,
  PatchProjectStatusRequest,
  PatchProjectManagementRequest,
  DeleteProjectMemberRequest,
  DeleteProjectManagementRequest,
  PostProjectMailRequest,
} from "@/lib/types/project";

import type {
  GetMyPageResponse,
  PatchMyPageRequest,
  PatchMyPageResponse,
  GetMyPageGithubStatsResponse,
  GetMyPageProjectsSummaryResponse,
  GetMyPageProjectsCreatedResponse,
  GetMyPageProjectsAppliedResponse,
  GetUsersMyPageResponse,
  PatchUsersMyPageRequest,
  PatchUsersMyPageResponse,
} from "@/lib/types/mypage";

type SendAuthEmailRequest = { email: string };
type SendAuthEmailResponse = { message: string };

type VerifyAuthEmailRequest = { email: string; code: string };
type VerifyAuthEmailResponse = { verified: boolean };

const BASE_URL = getApiBaseUrl?.() ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  options?: RequestInit,
  auth: boolean = false
): Promise<T> {
  const token = auth ? getAccessToken() : null;

  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const hasBody = options?.body != null;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }

  // 204 No Content 대응
  if (res.status === 204) return {} as T;

  // 빈 바디 대응
  const text = await res.text().catch(() => "");
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    // JSON이 아닌 응답일 경우(드뭄) 방어적으로 빈 객체 반환
    return {} as T;
  }
}

/* ===============================
   PROJECTS - GET
================================ */

export const apiGetProjectsList = () =>
  request<ProjectListResponse>("/projects/list");

export const apiGetProjectsRecommend = () =>
  request<ProjectRecommendResponse>("/projects/recommend", undefined, true);

export const apiGetProjectsWishlist = () =>
  request<ProjectWishlistResponse>("/projects/wishlist", undefined, true);

export const apiGetProjectsManagement = () =>
  request<ProjectManagementResponse>("/projects/management", undefined, true);

export const apiGetProjectDetail = (projectId: string) =>
  request<ProjectDetailResponse>(`/projects/${projectId}`);

export const apiGetProjectSimilar = (projectId: string) =>
  request<ProjectSimilarResponse>(`/projects/${projectId}/similar`);

/* ===============================
   PROJECTS - PATCH
================================ */

export const apiPatchProjectStatus = (body: PatchProjectStatusRequest) =>
  request<void>(
    "/projects/status",
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    true
  );

export const apiPatchProjectManagement = (body: PatchProjectManagementRequest) =>
  request<void>(
    "/projects/management",
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    true
  );

/* ===============================
   PROJECTS - DELETE
================================ */

export const apiDeleteProjectMember = (body: DeleteProjectMemberRequest) =>
  request<void>(
    "/projects/member",
    {
      method: "DELETE",
      body: JSON.stringify(body),
    },
    true
  );

export const apiDeleteProjectManagement = (body: DeleteProjectManagementRequest) =>
  request<void>(
    "/projects/management",
    {
      method: "DELETE",
      body: JSON.stringify(body),
    },
    true
  );

/* ===============================
   PROJECTS - POST
================================ */

export const apiPostProjectMail = (body: PostProjectMailRequest) =>
  request<void>(
    "/projects/mail",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    true
  );

/* ===============================
   MYPAGE
================================ */

// GET /mypage
export const apiGetMyPage = () =>
  request<GetMyPageResponse>("/mypage", undefined, true);

// PATCH /mypage
export const apiPatchMyPage = (body: PatchMyPageRequest) =>
  request<PatchMyPageResponse>(
    "/mypage",
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    true
  );

// GET /mypage/github/stats
export const apiGetMyPageGithubStats = () =>
  request<GetMyPageGithubStatsResponse>("/mypage/github/stats", undefined, true);

// GET /mypage/projects/summary
export const apiGetMyPageProjectsSummary = () =>
  request<GetMyPageProjectsSummaryResponse>("/mypage/projects/summary", undefined, true);

// GET /mypage/projects/created
export const apiGetMyPageProjectsCreated = (params?: { page?: number; size?: number }) => {
  const page = params?.page ?? 1;
  const size = params?.size ?? 10;
  return request<GetMyPageProjectsCreatedResponse>(
    `/mypage/projects/created?page=${page}&size=${size}`,
    undefined,
    true
  );
};

// GET /mypage/projects/applied
export const apiGetMyPageProjectsApplied = () =>
  request<GetMyPageProjectsAppliedResponse>("/mypage/projects/applied", undefined, true);

/* ===============================
   USERS/MYPAGE
================================ */

// GET /users/mypage
export const apiGetUsersMyPage = () =>
  request<GetUsersMyPageResponse>("/users/mypage", undefined, true);

// PATCH /users/mypage
export const apiPatchUsersMyPage = (body: PatchUsersMyPageRequest) =>
  request<PatchUsersMyPageResponse>(
    "/users/mypage",
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    true
  );

/* ===============================
   AUTH (email)
================================ */

// POST /auth/email/send
export const apiPostAuthEmailSend = (body: SendAuthEmailRequest) =>
  request<SendAuthEmailResponse>(
    "/auth/email/send",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    false
  );

// POST /auth/email/verify
export const apiPostAuthEmailVerify = (body: VerifyAuthEmailRequest) =>
  request<VerifyAuthEmailResponse>(
    "/auth/email/verify",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    false
  );
