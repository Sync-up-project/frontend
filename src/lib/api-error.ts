/** 백엔드 AllExceptionsFilter 응답 형식 */
export type ApiErrorBody = {
  success?: boolean;
  code?: string;
  message?: string;
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function parseApiError(data: unknown, status: number): ApiError {
  if (data && typeof data === "object") {
    const o = data as ApiErrorBody;
    const message =
      (typeof o.message === "string" && o.message) ||
      (typeof (o as { error?: string }).error === "string" &&
        (o as { error: string }).error) ||
      `요청에 실패했습니다. (HTTP ${status})`;
    return new ApiError(
      message,
      status,
      typeof o.code === "string" ? o.code : undefined,
      typeof o.requestId === "string" ? o.requestId : undefined
    );
  }
  if (typeof data === "string" && data.trim()) {
    return new ApiError(data, status);
  }
  return new ApiError(`요청에 실패했습니다. (HTTP ${status})`, status);
}
