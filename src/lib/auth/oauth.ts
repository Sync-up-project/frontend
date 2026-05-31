import { getApiBaseUrl } from "../api-base-url";

const TOKEN_KEY = "syncup_access_token";

function persistAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("auth:changed"));
}

export type OAuthSessionResult = {
  accessToken: string;
};

/**
 * GitHub OAuth 콜백 직후 호출합니다.
 * 백엔드가 심어 둔 HttpOnly 쿠키(oauth_access_once)에서 access token을 1회만 받아 localStorage에 저장합니다.
 *
 * URL query의 accessToken은 사용하지 않습니다 (보안).
 */
export async function consumeOAuthSession(): Promise<OAuthSessionResult> {
  const url = `${getApiBaseUrl()}/auth/oauth/session`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson
    ? ((await res.json().catch(() => null)) as {
        accessToken?: string;
        message?: string;
      } | null)
    : null;

  if (!res.ok) {
    const message =
      (data && typeof data.message === "string" && data.message) ||
      (res.status === 401
        ? "GitHub 로그인 세션이 만료되었습니다. 다시 GitHub로 로그인해 주세요."
        : `OAuth 토큰 수령에 실패했습니다. (HTTP ${res.status})`);
    throw new Error(message);
  }

  const token = typeof data?.accessToken === "string" ? data.accessToken.trim() : "";
  if (!token) {
    throw new Error(
      "GitHub 로그인은 완료되었지만 access token을 받지 못했습니다. 백엔드가 최신인지 확인해 주세요.",
    );
  }

  persistAccessToken(token);
  return { accessToken: token };
}
