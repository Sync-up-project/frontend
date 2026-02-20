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
  PatchMyPageLangRequest,
  PatchMyPageTechesRequest,
  PatchMyPagePositionsRequest,
  PatchMyPageProjectsRequest,
  GetUsersMyPageResponse,
  GetMyPageGithubStatsResponse,
  GetMyPageProjectsSummaryResponse,
  GetMyPageProjectsCreatedResponse,
  GetMyPageProjectsAppliedResponse,
  PatchUsersMyPageRequest,
  PatchUsersMyPageResponse,
} from "@/lib/types/mypage";

/**
 * ------------------------------------------------------------
 * Base fetch helpers
 * ------------------------------------------------------------
 */

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiOptions = {
  method?: HttpMethod;
  auth?: boolean;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;

  /**
   * ✅ 백엔드 미구현 API에 대한 방어 처리용
   * - true면 404일 때 throw 하지 않고 undefined를 반환합니다.
   * - 호출 측에서 undefined 처리(빈 배열/빈 객체로 대체)하면 콘솔 에러가 사라집니다.
   */
  allow404?: boolean;
};

function buildUrl(path: string) {
  const base = getApiBaseUrl();
  if (!base) return path; // fallback (dev)
  if (path.startsWith("http")) return path;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = buildUrl(path);
  const {
    method = "GET",
    auth = false,
    headers = {},
    body,
    signal,
    allow404 = false,
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  // JSON body default header
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] =
      finalHeaders["Content-Type"] ?? "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
        ? body
        : JSON.stringify(body),
    signal,
  });

  // ✅ 미구현 API는 404를 허용해서 조용히 처리
  if (allow404 && res.status === 404) {
    return undefined as unknown as T;
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let message = `API Error (${res.status})`;
    try {
      const payload = isJson ? await res.json() : await res.text();
      if (typeof payload === "string" && payload.trim()) message = payload;

      if (
        payload &&
        typeof payload === "object" &&
        ("message" in payload || "error" in payload)
      ) {
        message = (payload as any).message ?? (payload as any).error ?? message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  if (isJson) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

/**
 * 다양한 백엔드 응답 구조에서 "배열"을 안전하게 꺼내오기 위한 방어 유틸.
 */
export function pickArray<T = any>(payload: any): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];

  const candidates = [
    "items",
    "posts",
    "notices",
    "comments",
    "content",
    "data",
    "result",
    "results",
    "list",
    "project",
    "projects",
  ];

  for (const key of candidates) {
    const v = payload?.[key];
    if (Array.isArray(v)) return v as T[];
    if (v && typeof v === "object") {
      for (const nestedKey of candidates) {
        const nv = v?.[nestedKey];
        if (Array.isArray(nv)) return nv as T[];
      }
    }
  }

  return [];
}

/**
 * ------------------------------------------------------------
 * Project APIs
 * ------------------------------------------------------------
 */

/**
 * 프로젝트 목록
 * ✅ 기본값은 /projects/list
 */
export async function apiGetProjectList(
  query: string = ""
): Promise<ProjectListResponse> {
  const q = query ? `?${query}` : "";
  return apiFetch<ProjectListResponse>(`/projects/list${q}`);
}

/**
 * ✅ 별칭: 프로젝트 페이지가 이 이름을 쓰는 경우 대응
 */
export async function apiGetProjectsList(
  query: string = ""
): Promise<ProjectListResponse> {
  return apiGetProjectList(query);
}

/**
 * 추천 프로젝트
 * - 백엔드 미구현이면 404가 나므로 allow404 처리 후 빈 형태로 반환
 */
export async function apiGetProjectRecommend(): Promise<ProjectRecommendResponse> {
  const res = await apiFetch<ProjectRecommendResponse>(`/projects/recommend`, {
    auth: true,
    allow404: true,
  });

  // ✅ 404(미구현)면 undefined가 오므로, 프론트가 기대하는 형태로 빈값 리턴
  if (!res) {
    return {
      project: [],
      techStacks: [],
    } as any;
  }

  return res;
}

/**
 * ✅ 별칭 추가: ProjectsClient.tsx가 복수형을 import하는 경우 대응
 */
export async function apiGetProjectsRecommend(): Promise<ProjectRecommendResponse> {
  return apiGetProjectRecommend();
}

/**
 * 찜 목록
 * - 백엔드 미구현이면 404가 나므로 allow404 처리 후 빈 형태로 반환
 */
export async function apiGetProjectWishlist(): Promise<ProjectWishlistResponse> {
  const res = await apiFetch<ProjectWishlistResponse>(`/projects/wishlist`, {
    auth: true,
    allow404: true,
  });

  if (!res) {
    return {
      project: [],
      techStacks: [],
    } as any;
  }

  return res;
}

/**
 * ✅ 별칭 추가: ProjectsClient.tsx가 복수형을 import하는 경우 대응
 */
export async function apiGetProjectsWishlist(): Promise<ProjectWishlistResponse> {
  return apiGetProjectWishlist();
}

export async function apiGetProjectManagement(): Promise<ProjectManagementResponse> {
  return apiFetch<ProjectManagementResponse>(`/projects/management`, {
    auth: true,
  });
}

export async function apiGetProjectDetail(
  projectId: string
): Promise<ProjectDetailResponse> {
  return apiFetch<ProjectDetailResponse>(`/projects/${projectId}`);
}

export async function apiGetProjectSimilar(
  projectId: string
): Promise<ProjectSimilarResponse> {
  return apiFetch<ProjectSimilarResponse>(`/projects/${projectId}/similar`);
}

export async function apiPatchProjectStatus(
  projectId: string,
  body: PatchProjectStatusRequest
) {
  return apiFetch(`/projects/${projectId}/status`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export async function apiPatchProjectManagement(
  projectId: string,
  body: PatchProjectManagementRequest
) {
  return apiFetch(`/projects/${projectId}/management`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export async function apiDeleteProjectMember(
  projectId: string,
  body: DeleteProjectMemberRequest
) {
  return apiFetch(`/projects/${projectId}/members`, {
    method: "DELETE",
    auth: true,
    body,
  });
}

export async function apiDeleteProjectManagement(
  projectId: string,
  body: DeleteProjectManagementRequest
) {
  return apiFetch(`/projects/${projectId}/management`, {
    method: "DELETE",
    auth: true,
    body,
  });
}

export async function apiPostProjectMail(
  projectId: string,
  body: PostProjectMailRequest
) {
  return apiFetch(`/projects/${projectId}/mail`, {
    method: "POST",
    auth: true,
    body,
  });
}

/**
 * ------------------------------------------------------------
 * MyPage APIs
 * ------------------------------------------------------------
 */

export async function apiGetMyPage(): Promise<GetMyPageResponse> {
  return apiFetch<GetMyPageResponse>(`/mypage`, { auth: true });
}

export async function apiPatchMyPage(body: PatchMyPageRequest) {
  return apiFetch(`/mypage`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPageLang(body: PatchMyPageLangRequest) {
  return apiFetch(`/mypage/languages`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPageTeches(body: PatchMyPageTechesRequest) {
  return apiFetch(`/mypage/teches`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPagePositions(body: PatchMyPagePositionsRequest) {
  return apiFetch(`/mypage/positions`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPageProjects(body: PatchMyPageProjectsRequest) {
  return apiFetch(`/mypage/projects`, { method: "PATCH", auth: true, body });
}

/**
 * ✅ mypage/page.tsx가 import 하는 추가 API들
 * (백엔드 미구현이면 404는 날 수 있지만, import 에러는 사라집니다.)
 */

export async function apiGetUsersMyPage(): Promise<GetUsersMyPageResponse> {
  return apiFetch<GetUsersMyPageResponse>(`/users/mypage`, { auth: true });
}

export async function apiPatchUsersMyPage(
  body: PatchUsersMyPageRequest
): Promise<PatchUsersMyPageResponse> {
  return apiFetch<PatchUsersMyPageResponse>(`/users/mypage`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export async function apiGetMyPageGithubStats(): Promise<GetMyPageGithubStatsResponse> {
  return apiFetch<GetMyPageGithubStatsResponse>(`/mypage/github/stats`, {
    auth: true,
  });
}

export async function apiGetMyPageProjectsSummary(): Promise<GetMyPageProjectsSummaryResponse> {
  return apiFetch<GetMyPageProjectsSummaryResponse>(`/mypage/projects/summary`, {
    auth: true,
  });
}

export async function apiGetMyPageProjectsCreated(params?: {
  page?: number;
  size?: number;
}): Promise<GetMyPageProjectsCreatedResponse> {
  const usp = new URLSearchParams();
  if (typeof params?.page === "number") usp.set("page", String(params.page));
  if (typeof params?.size === "number") usp.set("size", String(params.size));
  const qs = usp.toString();

  return apiFetch<GetMyPageProjectsCreatedResponse>(
    `/mypage/projects/created${qs ? `?${qs}` : ""}`,
    { auth: true }
  );
}

export async function apiGetMyPageProjectsApplied(): Promise<GetMyPageProjectsAppliedResponse> {
  return apiFetch<GetMyPageProjectsAppliedResponse>(`/mypage/projects/applied`, {
    auth: true,
  });
}

/**
 * ------------------------------------------------------------
 * Community / Notice APIs (추가)
 * ------------------------------------------------------------
 */

export type CommunityPostDto = {
  id?: string | number;
  postId?: string | number;
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  author?: {
    id?: string | number;
    name?: string;
    nickname?: string;
    email?: string;
  };
  authorName?: string;
  views?: number;
  likes?: number;
  commentsCount?: number;
};

export type CommunityCommentDto = {
  id?: string | number;
  commentId?: string | number;
  content?: string;
  createdAt?: string;
  author?: {
    id?: string | number;
    name?: string;
    nickname?: string;
  };
  authorName?: string;
};

export type NoticeDto = {
  id?: string | number;
  noticeId?: string | number;
  title?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  pinned?: boolean;
  author?: {
    id?: string | number;
    name?: string;
    nickname?: string;
  };
  authorName?: string;
};

export type GetCommunityPostsParams = {
  category?: string;
  sort?: string;
  q?: string;
  page?: number;
  size?: number;
};

export async function apiGetCommunityPosts(params: GetCommunityPostsParams = {}) {
  const usp = new URLSearchParams();
  if (params.category) usp.set("category", params.category);
  if (params.sort) usp.set("sort", params.sort);
  if (params.q) usp.set("q", params.q);
  if (typeof params.page === "number") usp.set("page", String(params.page));
  if (typeof params.size === "number") usp.set("size", String(params.size));

  const qs = usp.toString();
  return apiFetch<any>(`/community/posts${qs ? `?${qs}` : ""}`);
}

export async function apiGetCommunityPost(postId: string) {
  return apiFetch<any>(`/community/posts/${postId}`);
}

export async function apiPostCommunityPost(body: {
  category: string;
  title: string;
  content: string;
  tags?: string[];
  authorName?: string;
}) {
  return apiFetch<any>(`/community/posts`, {
    method: "POST",
    auth: true,
    body,
  });
}

export async function apiGetCommunityComments(postId: string) {
  return apiFetch<any>(`/community/posts/${postId}/comments`);
}

export async function apiPostCommunityComment(
  postId: string,
  body: { content: string }
) {
  return apiFetch<any>(`/community/posts/${postId}/comments`, {
    method: "POST",
    auth: true,
    body,
  });
}

export type GetNoticesParams = {
  q?: string;
  page?: number;
  size?: number;
};

export async function apiGetNotices(params: GetNoticesParams = {}) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (typeof params.page === "number") usp.set("page", String(params.page));
  if (typeof params.size === "number") usp.set("size", String(params.size));

  const qs = usp.toString();
  return apiFetch<any>(`/notices${qs ? `?${qs}` : ""}`);
}

export async function apiGetNotice(noticeId: string) {
  return apiFetch<any>(`/notices/${noticeId}`);
}

export async function apiPostNotice(body: {
  title: string;
  content: string;
  authorName?: string;
  pinned?: boolean;
}) {
  return apiFetch<any>(`/notices`, {
    method: "POST",
    auth: true,
    body,
  });
}
