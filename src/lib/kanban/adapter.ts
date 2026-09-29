import { KanbanBoardData, KanbanColumnKey } from "./types";

const COLUMN_KEYS: readonly string[] = ["todo", "doing", "done"];

function isColumnKey(v: unknown): v is KanbanColumnKey {
  return typeof v === "string" && COLUMN_KEYS.includes(v);
}

const defaultBoard = (projectId: string): KanbanBoardData => ({
  projectId,
  columns: {
    todo: { key: "todo", title: "To do", cardIds: [] },
    doing: { key: "doing", title: "Doing", cardIds: [] },
    done: { key: "done", title: "Done", cardIds: [] },
  },
  cards: {},
});

export function toKanbanBoardData(
  projectId: string,
  raw: any
): KanbanBoardData {
  // 1) 이미 우리가 원하는 형태라면 그대로
  if (raw?.columns?.todo && raw?.cards) return raw as KanbanBoardData;

  // 2) 배열 기반 형태(예: columns: [{id,title,cards:[...]}]) 같은 걸 대비
  if (Array.isArray(raw?.columns)) {
    const board = defaultBoard(projectId);
    for (const col of raw.columns) {
      const key: unknown = col.key ?? col.id;
      if (!isColumnKey(key)) continue;

      board.columns[key].title = col.title ?? board.columns[key].title;

      const cards = col.cards ?? [];
      for (const c of cards) {
        const id = String(c.id);
        board.cards[id] = {
          id,
          title: c.title ?? c.name ?? "Untitled",
          description: c.description ?? "",
        };
        board.columns[key].cardIds.push(id);
      }
    }
    return board;
  }

  // 3) 아무 것도 없으면 기본 보드
  return defaultBoard(projectId);
}
