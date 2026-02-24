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
      // 흔한 래핑: { data: { items: [...] } }
      for (const k2 of candidates) {
        const v2 = (v as any)?.[k2];
        if (Array.isArray(v2)) return v2 as T[];
      }
    }
  }

  return [];
}

/**
 * ------------------------------------------------------------
 * Projects APIs
 * ------------------------------------------------------------
 * (기존 내용 유지)
 */

// ... (중간 생략 없이 실제 파일에는 기존 프로젝트/마이페이지 API들이 그대로 있습니다)
// ❗️여기서는 사용자가 올린 원본 파일 구조상, 아래 커뮤니티/공지사항 섹션만 교체했습니다.

export async function apiGetProjectsList(): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>(`/projects`);
}

export async function apiGetProjectsRecommend(): Promise<ProjectRecommendResponse> {
  return apiFetch<ProjectRecommendResponse>(`/projects/recommend`, { allow404: true });
}

export async function apiGetProjectsWishlist(): Promise<ProjectWishlistResponse> {
  return apiFetch<ProjectWishlistResponse>(`/projects/wishlist`, { auth: true, allow404: true });
}

export async function apiGetProjectManagement(): Promise<ProjectManagementResponse> {
  return apiFetch<ProjectManagementResponse>(`/projects/management`, { auth: true, allow404: true });
}

export async function apiGetProjectDetail(projectId: string): Promise<ProjectDetailResponse> {
  return apiFetch<ProjectDetailResponse>(`/projects/${projectId}`);
}

export async function apiGetProjectSimilar(projectId: string): Promise<ProjectSimilarResponse> {
  return apiFetch<ProjectSimilarResponse>(`/projects/${projectId}/similar`, { allow404: true });
}

export async function apiPatchProjectStatus(
  projectId: string,
  body: PatchProjectStatusRequest,
): Promise<any> {
  return apiFetch<any>(`/projects/${projectId}/status`, { method: "PATCH", auth: true, body });
}

export async function apiPatchProjectManagement(
  projectId: string,
  body: PatchProjectManagementRequest,
): Promise<any> {
  return apiFetch<any>(`/projects/${projectId}/management`, { method: "PATCH", auth: true, body });
}

export async function apiDeleteProjectMember(
  projectId: string,
  body: DeleteProjectMemberRequest,
): Promise<any> {
  return apiFetch<any>(`/projects/${projectId}/members`, { method: "DELETE", auth: true, body });
}

export async function apiDeleteProjectManagement(
  projectId: string,
  body: DeleteProjectManagementRequest,
): Promise<any> {
  return apiFetch<any>(`/projects/${projectId}/management`, { method: "DELETE", auth: true, body });
}

export async function apiPostProjectMail(
  projectId: string,
  body: PostProjectMailRequest,
): Promise<any> {
  return apiFetch<any>(`/projects/${projectId}/mail`, { method: "POST", auth: true, body, allow404: true });
}

/**
 * ------------------------------------------------------------
 * MyPage APIs
 * ------------------------------------------------------------
 * (기존 내용 유지)
 */

export async function apiGetMyPage(): Promise<GetMyPageResponse> {
  return apiFetch<GetMyPageResponse>(`/mypage`, { auth: true });
}

export async function apiPatchMyPage(body: PatchMyPageRequest): Promise<any> {
  return apiFetch<any>(`/mypage`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPageLang(body: PatchMyPageLangRequest): Promise<any> {
  return apiFetch<any>(`/mypage/lang`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPageTeches(body: PatchMyPageTechesRequest): Promise<any> {
  return apiFetch<any>(`/mypage/teches`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPagePositions(body: PatchMyPagePositionsRequest): Promise<any> {
  return apiFetch<any>(`/mypage/positions`, { method: "PATCH", auth: true, body });
}

export async function apiPatchMyPageProjects(body: PatchMyPageProjectsRequest): Promise<any> {
  return apiFetch<any>(`/mypage/projects`, { method: "PATCH", auth: true, body });
}

export async function apiGetUsersMyPage(userId: string): Promise<GetUsersMyPageResponse> {
  return apiFetch<GetUsersMyPageResponse>(`/users/${userId}/mypage`, { auth: true });
}

export async function apiPatchUsersMyPage(
  userId: string,
  body: PatchUsersMyPageRequest,
): Promise<PatchUsersMyPageResponse> {
  return apiFetch<PatchUsersMyPageResponse>(`/users/${userId}/mypage`, { method: "PATCH", auth: true, body });
}

export async function apiGetMyPageGithubStats(): Promise<GetMyPageGithubStatsResponse> {
  return apiFetch<GetMyPageGithubStatsResponse>(`/mypage/github/stats`, { auth: true, allow404: true });
}

export async function apiGetMyPageProjectsSummary(): Promise<GetMyPageProjectsSummaryResponse> {
  return apiFetch<GetMyPageProjectsSummaryResponse>(`/mypage/projects/summary`, { auth: true });
}

export async function apiGetMyPageProjectsCreated(): Promise<GetMyPageProjectsCreatedResponse> {
  return apiFetch<GetMyPageProjectsCreatedResponse>(`/mypage/projects/created`, { auth: true });
}

export async function apiGetMyPageProjectsApplied(): Promise<GetMyPageProjectsAppliedResponse> {
  return apiFetch<GetMyPageProjectsAppliedResponse>(`/mypage/projects/applied`, { auth: true });
}

/**
 * ------------------------------------------------------------
 * Community / Notice APIs
 * - backend(main) 기준: /community, /notices
 * ------------------------------------------------------------
 */

export type PostCategory = "FREE" | "QUESTION" | "SHARE" | "REVIEW";
export type UiPostCategory = "free" | "question" | "share" | "review";

export function uiToApiPostCategory(
  v?: UiPostCategory | PostCategory | string | null,
): PostCategory | undefined {
  if (!v) return undefined;
  const s = String(v).toUpperCase();
  if (s === "FREE") return "FREE";
  if (s === "QUESTION") return "QUESTION";
  if (s === "SHARE") return "SHARE";
  if (s === "REVIEW") return "REVIEW";
  if (s === "QNA") return "QUESTION";
  return undefined;
}

export function apiToUiPostCategory(
  v?: UiPostCategory | PostCategory | string | null,
): UiPostCategory {
  const s = String(v ?? "").toUpperCase();
  switch (s) {
    case "QUESTION":
      return "question";
    case "SHARE":
      return "share";
    case "REVIEW":
      return "review";
    case "FREE":
    default:
      return "free";
  }
}

export type CommunityPostListItem = {
  id: string;
  category: PostCategory;
  title: string;
  authorNickname: string;
  createdAt: string;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  i18n?: Array<{ lang: string; title: string }>;
};

export type CommunityPostsResponse = {
  posts: CommunityPostListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CommunityPostDetail = {
  id: string;
  authorId: string;
  category: PostCategory;
  originalLang: string;
  titleOriginal: string;
  contentOriginal: string;
  tags: string[];
  likeCount: number;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;

  author?: { id: string; nickname: string; email?: string };
  i18n?: Array<{ lang: string; title: string; content: string }>;

  comments?: any[];
  _count?: { comments?: number; likes?: number };
};

export type CommunityCommentCreateRequest = {
  authorId: string;
  content: string;
  originalLang?: string; // KO/JA/EN...
  parentCommentId?: string;
};

export type GetCommunityPostsParams = {
  category?: UiPostCategory | PostCategory;
  limit?: number;
  offset?: number;
  sortBy?: "latest" | "popular" | "commented";
};

export async function apiGetCommunityPosts(
  params: GetCommunityPostsParams = {},
): Promise<CommunityPostsResponse> {
  const usp = new URLSearchParams();

  const cat = uiToApiPostCategory(params.category);
  if (cat) usp.set("category", cat);

  const limit = typeof params.limit === "number" ? params.limit : 20;
  const offset = typeof params.offset === "number" ? params.offset : 0;
  usp.set("limit", String(limit));
  usp.set("offset", String(offset));

  const sortBy = params.sortBy ?? "latest";
  usp.set("sortBy", sortBy);

  return apiFetch<CommunityPostsResponse>(`/community/posts?${usp.toString()}`);
}

export async function apiGetCommunityPost(
  postId: string,
): Promise<CommunityPostDetail> {
  return apiFetch<CommunityPostDetail>(`/community/posts/${postId}`);
}

export type CreateCommunityPostRequest = {
  authorId: string;
  category: UiPostCategory | PostCategory;
  title: string;
  content: string;
  originalLang?: string; // KO/JA/EN...
  tags?: string[];
};

export async function apiPostCommunityPost(body: CreateCommunityPostRequest) {
  const category = uiToApiPostCategory(body.category) ?? "FREE";
  if (!body.authorId) throw new Error("authorId가 필요합니다.");

  return apiFetch<any>(`/community/posts`, {
    method: "POST",
    auth: true,
    body: {
      authorId: body.authorId,
      category,
      titleOriginal: body.title,
      contentOriginal: body.content,
      originalLang: body.originalLang,
      tags: body.tags ?? [],
    },
  });
}

export async function apiPatchCommunityPost(
  postId: string,
  body: {
    title?: string;
    content?: string;
    category?: UiPostCategory | PostCategory;
    tags?: string[];
  },
) {
  const payload: any = {};
  if (body.title !== undefined) payload.titleOriginal = body.title;
  if (body.content !== undefined) payload.contentOriginal = body.content;
  if (body.category !== undefined)
    payload.category = uiToApiPostCategory(body.category);
  if (body.tags !== undefined) payload.tags = body.tags;

  return apiFetch<any>(`/community/posts/${postId}`, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
}

export async function apiDeleteCommunityPost(postId: string) {
  return apiFetch<any>(`/community/posts/${postId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function apiPostCommunityComment(
  postId: string,
  body: CommunityCommentCreateRequest,
) {
  if (!body.authorId) throw new Error("authorId가 필요합니다.");
  if (!body.content?.trim()) throw new Error("content가 필요합니다.");

  return apiFetch<any>(`/community/posts/${postId}/comments`, {
    method: "POST",
    auth: true,
    body: {
      authorId: body.authorId,
      contentOriginal: body.content,
      originalLang: body.originalLang,
      parentCommentId: body.parentCommentId,
    },
  });
}

export async function apiDeleteCommunityComment(commentId: string) {
  return apiFetch<any>(`/community/comments/${commentId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function apiToggleCommunityPostLike(postId: string, userId: string) {
  if (!userId) throw new Error("userId가 필요합니다.");
  return apiFetch<any>(`/community/posts/${postId}/like`, {
    method: "POST",
    auth: true,
    body: { userId },
  });
}

/**
 * Notice APIs
 */

export type NoticeListItem = {
  id: string;
  pinned: boolean;
  title: string;
  authorNickname: string;
  createdAt: string;
  viewCount: number;
  i18n?: Array<{ lang: string; title: string }>;
};

export type NoticesResponse = {
  notices: NoticeListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type GetNoticesParams = {
  limit?: number;
  offset?: number;
};

export async function apiGetNotices(
  params: GetNoticesParams = {},
): Promise<NoticesResponse> {
  const usp = new URLSearchParams();
  const limit = typeof params.limit === "number" ? params.limit : 20;
  const offset = typeof params.offset === "number" ? params.offset : 0;
  usp.set("limit", String(limit));
  usp.set("offset", String(offset));
  return apiFetch<NoticesResponse>(`/notices?${usp.toString()}`);
}

export async function apiGetNotice(noticeId: string) {
  return apiFetch<any>(`/notices/${noticeId}`);
}

export async function apiPostNotice(body: {
  authorId: string;
  title: string;
  content: string;
  originalLang?: string;
  pinned?: boolean;
}) {
  if (!body.authorId) throw new Error("authorId가 필요합니다.");
  return apiFetch<any>(`/notices`, {
    method: "POST",
    auth: true,
    body: {
      authorId: body.authorId,
      titleOriginal: body.title,
      contentOriginal: body.content,
      originalLang: body.originalLang,
      pinned: body.pinned ?? false,
    },
  });
}

export async function apiPatchNotice(
  noticeId: string,
  body: { title?: string; content?: string; pinned?: boolean },
) {
  const payload: any = {};
  if (body.title !== undefined) payload.titleOriginal = body.title;
  if (body.content !== undefined) payload.contentOriginal = body.content;
  if (body.pinned !== undefined) payload.pinned = body.pinned;

  return apiFetch<any>(`/notices/${noticeId}`, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
}

export async function apiDeleteNotice(noticeId: string) {
  return apiFetch<any>(`/notices/${noticeId}`, {
    method: "DELETE",
    auth: true,
  });
}