/**
 * 백엔드 주소 결정 로직은 이 파일에만 둡니다. (다른 곳에서 process.env 로 직접 조합 금지)
 *
 * 1) 브라우저에서 호출할 때: getPublicBackendUrl()
 *    - NEXT_PUBLIC_API_URL 이 있으면 그 값을 사용 (빌드 시점에 번들에 박힘)
 *    - 없으면 운영은 "/backend" (리버스 프록시가 백엔드로 전달), 개발은 http://localhost:3001
 *
 * 2) Next 서버(route handler)에서 호출할 때: getInternalBackendUrl()
 *    - INTERNAL_BACKEND_URL 이 있으면 그 값을 사용 (런타임에 읽힘)
 *    - 없으면 운영은 compose 서비스명 http://backend:3000, 개발은 http://localhost:3001
 */

const DEV_BACKEND_URL = "http://localhost:3001";
const PROD_PUBLIC_BACKEND_PATH = "/backend";
const PROD_INTERNAL_BACKEND_URL = "http://backend:3000";

const isProduction = process.env.NODE_ENV === "production";

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getPublicBackendUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return trimTrailingSlash(configured);
  return isProduction ? PROD_PUBLIC_BACKEND_PATH : DEV_BACKEND_URL;
}

export function getInternalBackendUrl(): string {
  const configured = process.env.INTERNAL_BACKEND_URL;
  if (configured) return trimTrailingSlash(configured);
  return isProduction ? PROD_INTERNAL_BACKEND_URL : DEV_BACKEND_URL;
}

/**
 * socket.io 는 URL 의 경로를 namespace 로 해석하므로,
 * 백엔드 주소에 경로(예: "/backend")가 붙어 있으면 그 경로는 path 옵션으로 옮겨야 합니다.
 *   "/backend"              → url: <현재 origin>/chat,  path: /backend/socket.io
 *   "http://localhost:3001" → url: http://localhost:3001/chat, path: /socket.io
 */
export function getSocketConfig(namespace: string): { url: string; path: string } {
  const base = new URL(getPublicBackendUrl(), window.location.origin);
  const prefix = trimTrailingSlash(base.pathname);
  return {
    url: `${base.origin}${namespace}`,
    path: `${prefix}/socket.io`,
  };
}
