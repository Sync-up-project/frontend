// src/lib/kanbanApi.ts
import { getAccessToken, getApiBaseUrl } from "@/lib/auth";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type ApiOptions = {
  method?: HttpMethod;
  auth?: boolean;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
};

function buildUrl(path: string) {
  const base = getApiBaseUrl();
  if (!base) return path;
  if (path.startsWith("http")) return path;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = buildUrl(path);
  const { method = "GET", auth = false, headers = {}, body, signal } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] =
      finalHeaders["Content-Type"] ?? "application/json";
  }

  if (auth) {
    const token = getAccessToken();
    if (!token) throw new Error("로그인이 필요합니다.");
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    credentials: "include",
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
        ? body
        : JSON.stringify(body),
    signal,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let message = `API Error (${res.status})`;
    try {
      const payload = isJson ? await res.json() : await res.text();
      if (typeof payload === "string" && payload.trim()) message = payload;
      if (
        payload &&
        typeof payload === "object" &&
        ("message" in payload || "error" in payload)
      ) {
        message =
          (payload as any).message ?? (payload as any).error ?? message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  if (isJson) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

/**
 * ------------------------------------------------------------
 * Types (칸반)
 * ------------------------------------------------------------
 */

export type KanbanColumnDto = {
  id: string;
  title: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
};

export type KanbanCardDto = {
  id: string;
  columnId: string;
  title: string;
  description?: string | null;
  status?: string | null;
  position: number;
  createdAt?: string;
  updatedAt?: string;
};

export type KanbanBoardDto = {
  boardId?: string;
  projectId: string;
  columns: Array<KanbanColumnDto & { cards: KanbanCardDto[] }>;
};

/**
 * ------------------------------------------------------------
 * Response normalize (백엔드 응답 구조가 달라도 최대한 흡수)
 * ------------------------------------------------------------
 */

function pickArray<T = any>(payload: any, keys: string[]): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  for (const k of keys) {
    const v = payload?.[k];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

function normalizeKanban(projectId: string, payload: any): KanbanBoardDto {
  // 가능한 응답 형태:
  // 1) { boardId, projectId, columns: [...], cards: [...] }
  // 2) { board: {...}, columns: [...], cards: [...] }
  // 3) { columns: [{..., cards:[...]}] }
  const root = payload?.board ?? payload ?? {};
  const columnsRaw = pickArray<any>(root, ["columns", "kanbanColumns", "items", "data"]);
  const cardsRaw =
    pickArray<any>(root, ["cards", "kanbanCards"]) ||
    pickArray<any>(payload, ["cards", "kanbanCards"]);

  // cards가 columnId로 묶이지 않고 flat이면 묶기
  const cardsByColumn = new Map<string, KanbanCardDto[]>();
  for (const c of cardsRaw ?? []) {
    const colId = String(c?.columnId ?? c?.kanbanColumnId ?? "");
    if (!colId) continue;
    const arr = cardsByColumn.get(colId) ?? [];
    arr.push({
      id: String(c?.id),
      columnId: colId,
      title: String(c?.title ?? ""),
      description: c?.description ?? null,
      status: c?.status ?? null,
      position: Number(c?.position ?? 0),
      createdAt: c?.createdAt,
      updatedAt: c?.updatedAt,
    });
    cardsByColumn.set(colId, arr);
  }

  const columns = (columnsRaw ?? []).map((col: any) => {
    const id = String(col?.id);
    const colCards =
      Array.isArray(col?.cards)
        ? (col.cards as any[]).map((c) => ({
            id: String(c?.id),
            columnId: id,
            title: String(c?.title ?? ""),
            description: c?.description ?? null,
            status: c?.status ?? null,
            position: Number(c?.position ?? 0),
            createdAt: c?.createdAt,
            updatedAt: c?.updatedAt,
          }))
        : (cardsByColumn.get(id) ?? []);

    // position 순 정렬
    colCards.sort((a, b) => a.position - b.position);

    return {
      id,
      title: String(col?.title ?? ""),
      position: Number(col?.position ?? 0),
      createdAt: col?.createdAt,
      updatedAt: col?.updatedAt,
      cards: colCards,
    };
  });

  columns.sort((a, b) => a.position - b.position);

  return {
    boardId: root?.id ? String(root.id) : root?.boardId ? String(root.boardId) : undefined,
    projectId,
    columns,
  };
}

/**
 * ------------------------------------------------------------
 * Kanban APIs (백엔드 준비된 엔드포인트만)
 * ------------------------------------------------------------
 */

// GET /projects/:projectId/kanban
export async function apiGetKanban(projectId: string): Promise<KanbanBoardDto> {
  const data = await apiFetch<any>(`/projects/${projectId}/kanban`, { auth: true });
  return normalizeKanban(projectId, data);
}

// POST /projects/:projectId/kanban/init
export async function apiInitKanban(projectId: string): Promise<KanbanBoardDto> {
  const data = await apiFetch<any>(`/projects/${projectId}/kanban/init`, {
    method: "POST",
    auth: true,
  });
  return normalizeKanban(projectId, data);
}

// POST /projects/:projectId/kanban/columns
export async function apiCreateKanbanColumn(projectId: string, body: { title: string; position?: number }) {
  return apiFetch<any>(`/projects/${projectId}/kanban/columns`, {
    method: "POST",
    auth: true,
    body,
  });
}

// PATCH /projects/:projectId/kanban/columns/:columnId
export async function apiUpdateKanbanColumn(projectId: string, columnId: string, body: { title?: string; position?: number }) {
  return apiFetch<any>(`/projects/${projectId}/kanban/columns/${columnId}`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

// DELETE /projects/:projectId/kanban/columns/:columnId
export async function apiDeleteKanbanColumn(projectId: string, columnId: string) {
  return apiFetch<any>(`/projects/${projectId}/kanban/columns/${columnId}`, {
    method: "DELETE",
    auth: true,
  });
}

// POST /projects/:projectId/kanban/cards
export async function apiCreateKanbanCard(projectId: string, body: { columnId: string; title: string; description?: string }) {
  return apiFetch<any>(`/projects/${projectId}/kanban/cards`, {
    method: "POST",
    auth: true,
    body,
  });
}

// PATCH /projects/:projectId/kanban/cards/:cardId
export async function apiUpdateKanbanCard(projectId: string, cardId: string, body: { title?: string; description?: string; position?: number }) {
  return apiFetch<any>(`/projects/${projectId}/kanban/cards/${cardId}`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

// DELETE /projects/:projectId/kanban/cards/:cardId
export async function apiDeleteKanbanCard(projectId: string, cardId: string) {
  return apiFetch<any>(`/projects/${projectId}/kanban/cards/${cardId}`, {
    method: "DELETE",
    auth: true,
  });
}

// POST /projects/:projectId/kanban/cards/move
export async function apiMoveKanbanCard(projectId: string, body: { cardId: string; toColumnId: string; toPosition: number }) {
  return apiFetch<any>(`/projects/${projectId}/kanban/cards/move`, {
    method: "POST",
    auth: true,
    body,
  });
}
