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

const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true";

export function getApiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
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

// 호환성: 기존 코드에서 setAccessToken을 import하는 경우 대응
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
  notifyAuthChanged();
}

export function saveCurrentUser(user: SessionUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

/**
 * ✅ 기존 동작 유지: 로컬 캐시(SessionUser)만 읽음
 * - "진짜 DB 유저"가 필요하면 fetchCurrentUser() 사용
 */
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
  const res = await fetch(input, init);

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

/**
 * ✅ 핵심 추가: 백엔드에서 현재 로그인 유저(/auth/me)를 Bearer로 가져오기
 * - 성공하면 로컬 캐시(SESSION_USER_KEY) 갱신
 */
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
    credentials: "include",
  });

  // { user: {...} } or {...}
  const u = data?.user ?? data ?? {};

  const normalized: SessionUser = {
    id: String(u?.id ?? ""),
    nickname: String(u?.nickname ?? u?.name ?? u?.username ?? ""),
    email: typeof u?.email === "string" ? u.email : undefined,
    role: typeof u?.role === "string" ? u.role : undefined,
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

/**
 * 닉네임 중복 확인
 * - 백엔드 미구현이면 UX를 막지 않기 위해 true(사용 가능)로 처리
 */
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

  // ✅ 가능하면 /auth/me로 최신 유저정보 동기화 (실패해도 로그인은 유지)
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

function makeDevToken(email: string): string {
  return `dev.${btoa(unescape(encodeURIComponent(email)))}.${Date.now()}`;
}

/**
 * ✅ 개발 시연용: 강제로 로그인 상태 만들기
 * - NEXT_PUBLIC_ENABLE_DEV_AUTH=true 일 때만 동작
 */
export function devLogin(): void {
  if (!DEV_AUTH_ENABLED) {
    throw new Error("DEV_AUTH가 비활성화되어 있습니다. (NEXT_PUBLIC_ENABLE_DEV_AUTH=true 필요)");
  }

  const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? "dev@example.com";
  const nickname = process.env.NEXT_PUBLIC_DEV_USER_NICKNAME ?? "dev";
  const id = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "dev-user";

  const token = makeDevToken(email);
  saveAccessToken(token);
  saveCurrentUser({ id, nickname, email });
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