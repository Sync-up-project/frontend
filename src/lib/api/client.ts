/**
 * @deprecated `@/lib/api` 또는 `@/lib/auth` 를 사용하세요.
 */
import { getAccessToken, getApiBaseUrl } from "@/lib/auth";

export function getBackendBaseUrl(): string {
  return getApiBaseUrl();
}

export function getStoredAccessToken(): string | null {
  return getAccessToken();
}
