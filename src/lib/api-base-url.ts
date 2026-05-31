/** 백엔드 REST API 베이스 URL (공통) */
export function getApiBaseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL;
  return env ?? "http://localhost:3001";
}
