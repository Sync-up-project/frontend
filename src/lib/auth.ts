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
const LOCAL_USERS_KEY = "syncup_local_users";

type LocalUser = {
  id: number;
  email: string;
  nickname: string;
  password: string; // 시연용(로컬)만 사용
};

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

function isDevEnv(): boolean {
  return process.env.NODE_ENV !== "production";
}

function loadLocalUsers(): LocalUser[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalUser[]) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function nextUserId(users: LocalUser[]): number {
  return users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
}

function makeDevToken(email: string): string {
  // 단순 시연용 토큰 (서버 미연동 시에도 “로그인 상태”만 표현)
  return `dev.${btoa(unescape(encodeURIComponent(email)))}.${Date.now()}`;
}

/**
 * 개발 시연용: 로컬 시연 계정을 보장해 둡니다.
 * - email: kwon@gmail.com
 * - password: 1234
 * - nickname: HB_Kwon
 */
export function seedLocalDemoUser(): { id: number; email: string; password: string; nickname: string } {
  const email = "kwon@gmail.com";
  const password = "1234";
  const nickname = "HB_Kwon";

  if (typeof window === "undefined") {
    return { id: 1, email, password, nickname };
  }

  const users = loadLocalUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!exists) {
    const newUser: LocalUser = {
      id: nextUserId(users),
      email,
      nickname,
      password,
    };
    users.push(newUser);
    saveLocalUsers(users);
    return { id: newUser.id, email, password, nickname };
  }

  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return { id: found?.id ?? 1, email, password, nickname: found?.nickname ?? nickname };
}

/**
 * 닉네임 중복 확인
 * - 백엔드 엔드포인트가 있으면 우선 확인합니다.
 * - 개발 환경에서는 백엔드가 없거나 실패할 때 로컬 시연 사용자 목록으로 폴백합니다.
 */
export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const trimmed = nickname.trim();
  if (!trimmed) return false;

  const url = `${getApiBaseUrl()}/auth/check-nickname?nickname=${encodeURIComponent(trimmed)}`;

  // 1) 백엔드 우선 시도
  try {
    const res = await fetch(url, { method: "GET" });

    // 충돌(중복) 등으로 409를 쓰는 구현이 있을 수 있어 우선 처리합니다.
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

      // 응답 형식이 불명확하더라도 200이면 “사용 가능”으로 간주합니다.
      return true;
    }

    // 백엔드가 엔드포인트를 제공하지만 비정상 응답인 경우
    // - 개발 환경: 로컬 폴백
    // - 운영 환경: UX 상 과도한 차단을 피하기 위해 true 처리(최종 검증은 signup에서 서버가 수행)
    if (!isDevEnv()) return true;
  } catch {
    // 네트워크 오류 등: 아래 로컬 폴백으로 처리합니다.
    if (!isDevEnv()) return true;
  }

  // 2) 개발 환경: 로컬(Mock) 폴백
  seedLocalDemoUser();

  const users = loadLocalUsers();
  const taken = users.some((u) => u.nickname.toLowerCase() === trimmed.toLowerCase());

  return !taken;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const url = `${getApiBaseUrl()}/auth/login`;

  // 1) 백엔드 먼저 시도
  try {
    const res = await fetchJson<LoginResponse>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res?.accessToken) saveAccessToken(res.accessToken);
    if (res?.user) saveCurrentUser(res.user);

    return res;
  } catch (err) {
    // 2) 개발 환경이면 로컬(Mock)로 폴백
    if (!isDevEnv()) throw err;

    // 데모 계정 보장
    seedLocalDemoUser();

    const users = loadLocalUsers();
    const found = users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());

    if (!found) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다. (로컬 시연 로그인)");
    if (found.password !== payload.password)
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다. (로컬 시연 로그인)");

    const res: LoginResponse = {
      accessToken: makeDevToken(found.email),
      user: { id: found.id, nickname: found.nickname },
    };

    saveAccessToken(res.accessToken);
    if (res.user) saveCurrentUser(res.user);

    return res;
  }
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  const url = `${getApiBaseUrl()}/auth/signup`;

  // 1) 백엔드 먼저 시도
  try {
    return await fetchJson<SignupResponse>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // 2) 개발 환경이면 로컬(Mock)로 폴백
    if (!isDevEnv()) throw err;

    const users = loadLocalUsers();

    const emailTaken = users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (emailTaken) throw new Error("이미 사용 중인 이메일입니다. (로컬 시연 회원가입)");

    const nickTaken = users.some((u) => u.nickname.toLowerCase() === payload.nickname.toLowerCase());
    if (nickTaken) throw new Error("이미 사용 중인 닉네임입니다. (로컬 시연 회원가입)");

    const newUser: LocalUser = {
      id: nextUserId(users),
      email: payload.email,
      nickname: payload.nickname,
      password: payload.password,
    };

    users.push(newUser);
    saveLocalUsers(users);

    return { id: newUser.id, email: newUser.email, nickname: newUser.nickname };
  }
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

/** 개발 시연용: 강제로 로그인 상태 만들기 */
export function devLogin(user?: { id: number; nickname: string; email?: string }): void {
  // 데모 계정 보장
  const demo = seedLocalDemoUser();

  const email = user?.email ?? demo.email;
  const token = makeDevToken(email);

  saveAccessToken(token);
  saveCurrentUser({
    id: user?.id ?? demo.id,
    nickname: user?.nickname ?? demo.nickname,
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
