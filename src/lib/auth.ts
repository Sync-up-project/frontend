// src/lib/auth.ts

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  user?: {
    id: number;
    nickname: string;
  };
};

type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
};

type SignupResponse = {
  id: number;
  email: string;
  nickname: string;
};

const TOKEN_KEY = "syncup_access_token";
const SESSION_USER_KEY = "syncup_session_user";

const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true";

/**
 * ✅ API Base URL
 * - 기존 하드코딩 최소화: env 우선
 * - 개발 기본값은 3001(현재 백엔드 기준)
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
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

export function saveCurrentUser(user: { id: number; nickname: string }): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

export function getCurrentUser(): { id: number; nickname: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: number; nickname: string };
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
 * 닉네임 중복 확인
 * - ✅ 백엔드가 제공하는 경우에만 검증합니다.
 * - 백엔드가 아직 미구현/오류라면:
 *   - 개발 환경에서는 UX를 막지 않기 위해 true(사용 가능)로 처리
 *   - 운영 환경에서는 서버 검증이 최종이므로 true 처리 (signup 시 서버가 최종 판단)
 */
export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) return false;

  const url = `${getApiBaseUrl()}/auth/check-nickname?nickname=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, { method: "GET" });

    // 중복을 409로 내리는 서버도 있어서 우선 처리
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
      // 200이면 사용 가능으로 간주
      return true;
    }

    // 엔드포인트는 있으나 비정상 응답
    return true;
  } catch {
    // 네트워크 오류 등: 개발/운영 모두 UX 막지 않기 위해 true
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

  return res;
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  const url = `${getApiBaseUrl()}/auth/signup`;

  return await fetchJson<SignupResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function authedGet<T>(path: string): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("인증 토큰이 없습니다.");

  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetchJson<T>(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

function makeDevToken(email: string): string {
  return `dev.${btoa(unescape(encodeURIComponent(email)))}.${Date.now()}`;
}

/**
 * ✅ 개발 시연용: 강제로 로그인 상태 만들기
 * - 하드코딩 제거: env로만 사용
 * - NEXT_PUBLIC_ENABLE_DEV_AUTH=true 일 때만 동작
 *
 * 사용 env:
 * - NEXT_PUBLIC_DEV_USER_EMAIL
 * - NEXT_PUBLIC_DEV_USER_NICKNAME
 * - NEXT_PUBLIC_DEV_USER_ID
 */
export function devLogin(): void {
  if (!DEV_AUTH_ENABLED) {
    throw new Error("DEV_AUTH가 비활성화되어 있습니다. (NEXT_PUBLIC_ENABLE_DEV_AUTH=true 필요)");
  }

  const email = process.env.NEXT_PUBLIC_DEV_USER_EMAIL ?? "dev@example.com";
  const nickname = process.env.NEXT_PUBLIC_DEV_USER_NICKNAME ?? "dev";
  const idRaw = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "1";
  const id = Number(idRaw) || 1;

  const token = makeDevToken(email);
  saveAccessToken(token);
  saveCurrentUser({ id, nickname });
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
