// src/lib/noticeApi.ts
"use client";

import { getAccessToken, getApiBaseUrl } from "@/lib/auth";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type ApiOptions = {
  method?: HttpMethod;
  auth?: boolean;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  allow404?: boolean; // ✅ 404면 throw하지 않고 undefined 반환
};

function buildUrl(path: string) {
  const base = getApiBaseUrl();
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

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = finalHeaders["Content-Type"] ?? "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
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
    cache: "no-store",
    credentials: "include",
  });

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
      if (payload && typeof payload === "object" && ("message" in payload || "error" in payload)) {
        message = (payload as any).message ?? (payload as any).error ?? message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (isJson ? await res.json() : await res.text()) as T;
}

/**
 * ------------------------------------------------------------
 * Types
 * ------------------------------------------------------------
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

export type NoticeDetail = {
  id: string;
  pinned: boolean;
  titleOriginal?: string;
  contentOriginal?: string;
  title?: string;
  content?: string;
  createdAt: string;
  updatedAt?: string;
  viewCount: number;
  likeCount?: number; // (현재 백엔드 응답에 없을 수도 있어 optional)
  author?: { id: string; nickname: string; email?: string };
  i18n?: Array<{ lang: string; title: string; content: string }>;
};

export type GetNoticesParams = {
  limit?: number;
  offset?: number;
};

/**
 * ------------------------------------------------------------
 * APIs (backend: /notices)
 * ------------------------------------------------------------
 */

export async function apiGetNotices(params: GetNoticesParams = {}): Promise<NoticesResponse> {
  const usp = new URLSearchParams();
  usp.set("limit", String(typeof params.limit === "number" ? params.limit : 20));
  usp.set("offset", String(typeof params.offset === "number" ? params.offset : 0));
  return apiFetch<NoticesResponse>(`/notices?${usp.toString()}`);
}

export async function apiGetNotice(noticeId: string): Promise<NoticeDetail> {
  return apiFetch<NoticeDetail>(`/notices/${noticeId}`);
}

export async function apiPostNotice(body: {
  authorId: string;
  title: string;
  content: string;
  pinned?: boolean;
  originalLang?: string; // KO/JA/EN...
}) {
  return apiFetch<any>(`/notices`, {
    method: "POST",
    auth: true,
    body: {
      authorId: body.authorId,
      titleOriginal: body.title,
      contentOriginal: body.content,
      pinned: body.pinned ?? false,
      originalLang: body.originalLang,
    },
  });
}
export async function apiToggleNoticeLike(noticeId: string) {
  return apiFetch<any>(`/notices/${noticeId}/like`, {
    method: "POST",
    auth: true,
    allow404: true,
  });
}