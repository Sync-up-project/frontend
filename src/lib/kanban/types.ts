export type KanbanColumnKey = "todo" | "doing" | "done";

export type KanbanCard = {
  id: string;
  title: string;
  description?: string;
  assigneeIds?: string[];
  dueDate?: string; // ISO
};

export type KanbanColumn = {
  key: KanbanColumnKey;
  title: string;
  cardIds: string[];
};

export type KanbanBoardData = {
  projectId: string;
  columns: Record<KanbanColumnKey, KanbanColumn>;
  cards: Record<string, KanbanCard>;
};
