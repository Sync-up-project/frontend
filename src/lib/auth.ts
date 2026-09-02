// src/lib/auth.ts

export type LoginRequest = {
  email: string;
  password: string;
};

export type SessionUser = {
  id: string; // ✅ Prisma/백엔드 ID는 보통 string
  nickname: string;
  email?: string;
  role?: string;
  accountRole?: string;
  profileImageUrl?: string | null;

  // (선택) GitHub 확장 대비
  github?: {
    isConnected?: boolean;
    username?: string;
    url?: string;
    avatarUrl?: string;
  };

  githubUsername?: string;
  githubUrl?: string;
  githubAvatarUrl?: string;
};

export type LoginResponse = {
  accessToken: string;
  expiresIn?: number;
  user?: SessionUser;
};

export type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
};

export type SignupResponse = {
  accessToken: string;
  expiresIn?: number;
  user?: SessionUser;
};

const TOKEN_KEY = "syncup_access_token";
const SESSION_USER_KEY = "syncup_session_user";
const ACTIVE_PROJECT_KEY = "syncup_active_project_id";

export function getApiBaseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL;
  const base = env ?? "http://localhost:3001";
  return base;
}

function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("auth:changed"));
}

export function saveAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  notifyAuthChanged();
}

export function setAccessToken(token: string): void {
  saveAccessToken(token);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(SESSION_USER_KEY);
  window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
  notifyAuthChanged();
}

function saveActiveProjectId(projectId: string | null): void {
  if (typeof window === "undefined") return;
  if (!projectId) {
    window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
  } else {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, String(projectId));
  }
}

export function saveCurrentUser(user: SessionUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

export function getCurrentUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getAccessToken());
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    ...init,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && String((data as any).message)) ||
      (typeof data === "string" && data) ||
      `요청에 실패했습니다. (HTTP ${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchCurrentUser(): Promise<SessionUser> {
  const token = getAccessToken();
  if (!token) throw new Error("인증 토큰이 없습니다.");

  const url = `${getApiBaseUrl()}/auth/me`;

  const data = await fetchJson<any>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  // { user: {...} } or {...}
  const u = data?.user ?? data ?? {};

  const normalized: SessionUser = {
    id: String(u?.id ?? ""),
    nickname: String(u?.nickname ?? u?.name ?? u?.username ?? ""),
    email: typeof u?.email === "string" ? u.email : undefined,
    role: typeof u?.role === "string" ? u.role : undefined,
    accountRole: typeof u?.accountRole === "string" ? u.accountRole : undefined,
    profileImageUrl:
      (u?.profileImageUrl ??
        u?.profile_image_url ??
        u?.githubAvatarUrl ??
        u?.avatarUrl ??
        u?.github?.avatarUrl ??
        null) as string | null,

    github: u?.github
      ? {
          isConnected: Boolean(u.github.isConnected),
          username: typeof u.github.username === "string" ? u.github.username : undefined,
          url: typeof u.github.url === "string" ? u.github.url : undefined,
          avatarUrl: typeof u.github.avatarUrl === "string" ? u.github.avatarUrl : undefined,
        }
      : undefined,

    githubUsername: typeof u?.githubUsername === "string" ? u.githubUsername : undefined,
    githubUrl: typeof u?.githubUrl === "string" ? u.githubUrl : undefined,
    githubAvatarUrl: typeof u?.githubAvatarUrl === "string" ? u.githubAvatarUrl : undefined,
  };

  if (!normalized.id || !normalized.nickname) {
    throw new Error("유저 정보를 불러왔지만 필수 필드(id/nickname)가 비어있습니다.");
  }

  saveCurrentUser(normalized);
  return normalized;
}

export async function refreshAccessToken(): Promise<{ accessToken: string; expiresIn?: number }> {
  const url = `${getApiBaseUrl()}/auth/refresh`;

  const data = await fetchJson<any>(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const token = typeof data?.accessToken === "string" ? data.accessToken : "";
  if (!token) throw new Error("refresh failed");
  saveAccessToken(token);
  return { accessToken: token, expiresIn: data?.expiresIn };
}

async function syncActiveProjectForCurrentUser(): Promise<void> {
  if (typeof window === "undefined") return;
  const token = getAccessToken();
  if (!token) return;

  const url = `${getApiBaseUrl()}/projects/my/active`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) {
      return;
    }

    const data = await res.json().catch(() => null as any);
    const pid = data?.projectId ?? data?.project?.id ?? null;
    if (pid) {
      saveActiveProjectId(String(pid));
    } else {
      saveActiveProjectId(null);
    }
  } catch {
  }
}

export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) return false;

  const url = `${getApiBaseUrl()}/auth/check-nickname?nickname=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, { method: "GET" });

    if (res.status === 409) return false;

    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = (await res.json().catch(() => null)) as any;
        if (data && typeof data === "object") {
          if ("available" in data) return Boolean(data.available);
          if ("isAvailable" in data) return Boolean(data.isAvailable);
          if ("ok" in data) return Boolean(data.ok);
        }
      }
      return true;
    }

    // 404/500 등은 “검증 불가 → 일단 통과”
    return true;
  } catch {
    return true;
  }
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const url = `${getApiBaseUrl()}/auth/login`;

  const res = await fetchJson<LoginResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res?.accessToken) saveAccessToken(res.accessToken);
  if (res?.user) saveCurrentUser(res.user);

  try {
    await fetchCurrentUser();
    await syncActiveProjectForCurrentUser();
  } catch {
    // ignore
  }

  return res;
}

export async function adminLogin(payload: LoginRequest): Promise<LoginResponse> {
  const url = `${getApiBaseUrl()}/auth/admin/login`;

  const res = await fetchJson<LoginResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res?.accessToken) saveAccessToken(res.accessToken);
  if (res?.user) saveCurrentUser(res.user);

  try {
    await fetchCurrentUser();
  } catch {
    // ignore
  }

  return res;
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  const url = `${getApiBaseUrl()}/auth/signup`;

  const res = await fetchJson<SignupResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res?.accessToken) saveAccessToken(res.accessToken);
  if (res?.user) saveCurrentUser(res.user);

  // ✅ 가능하면 /auth/me로 최신 유저정보 동기화
  try {
    await fetchCurrentUser();
    await syncActiveProjectForCurrentUser();
  } catch {
    // ignore
  }

  return res;
}

export async function authedGet<T>(path: string): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("인증 토큰이 없습니다.");

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetchJson<T>(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    credentials: "include",
  });
}

export async function sendEmailVerification(payload: { email: string }): Promise<{ message: string }> {
  const url = `${getApiBaseUrl()}/auth/email/send`;
  return fetchJson<{ message: string }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function verifyEmailCode(payload: { email: string; code: string }): Promise<{ verified: boolean }> {
  const url = `${getApiBaseUrl()}/auth/email/verify`;
  return fetchJson<{ verified: boolean }>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * ✅ 빌드에서 "not exported"가 뜨는 경우를 확실히 막기 위한 재-export(안전장치)
 * (중복 export여도 문제 없음)
 */
export {
  clearAccessToken as __clearAccessToken_export_guard,
  login as __login_export_guard,
  signup as __signup_export_guard,
  checkNicknameAvailable as __checkNickname_export_guard,
};
