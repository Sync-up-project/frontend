"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  Over,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type KanbanCardLike = {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
};

type KanbanColumnLike = {
  id: string;
  title: string;
  cards?: KanbanCardLike[];
};

type KanbanBoardLike = {
  id: string;
  columns: KanbanColumnLike[];
};

type Props = {
  projectId: string;
  board: KanbanBoardLike;

  /** 낙관적 업데이트용 (page.tsx의 setBoard를 그대로 넘겨주면 됨) */
  setBoard: (b: KanbanBoardLike) => void;

  /** 카드 추가 버튼 */
  onAddCard: (columnId: string, columnTitle: string) => void;

  /** 카드 수정/삭제 버튼(네가 이미 만든 모달 연결) */
  onEditCard: (card: KanbanCardLike, columnTitle: string) => void;
  onDeleteCard: (
    cardId: string,
    cardTitle: string,
    columnTitle: string
  ) => void;

  /** 실패 시 재조회 */
  refetchBoard: () => Promise<void>;
};

function cloneBoard(board: KanbanBoardLike): KanbanBoardLike {
  return {
    ...board,
    columns: board.columns.map((c) => ({
      ...c,
      cards: [...(c.cards ?? [])],
    })),
  };
}

function findColumnIdByCardId(board: KanbanBoardLike, cardId: string) {
  for (const col of board.columns) {
    if ((col.cards ?? []).some((c) => c.id === cardId)) return col.id;
  }
  return null;
}

function findCardById(
  board: KanbanBoardLike,
  cardId: string
): KanbanCardLike | null {
  for (const col of board.columns) {
    const card = (col.cards ?? []).find((c) => c.id === cardId);
    if (card) return card;
  }
  return null;
}

function isColumnId(board: KanbanBoardLike, id: string) {
  return board.columns.some((c) => c.id === id);
}

function getOverColumnId(
  board: KanbanBoardLike,
  over: Over | null
): string | null {
  if (!over) return null;

  const overId = String(over.id);

  // over가 컬럼이면 그대로
  if (isColumnId(board, overId)) return overId;

  // over가 카드면 그 카드가 속한 컬럼
  return findColumnIdByCardId(board, overId);
}

/** ✅ "이 컬럼에 있는 카드들"을 가져오되, 특정 카드(activeId)는 제외한 리스트 */
function getCardsExcludingActive(
  board: KanbanBoardLike,
  columnId: string,
  activeCardId: string
): KanbanCardLike[] {
  const col = board.columns.find((c) => c.id === columnId);
  const cards = col?.cards ?? [];
  return cards.filter((c) => c.id !== activeCardId);
}

export default function KanbanBoardDndView({
  projectId,
  board,
  setBoard,
  onAddCard,
  onEditCard,
  onDeleteCard,
  refetchBoard,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // ✅ 드래그 시작 시점의 fromColumnId를 고정 저장 (이게 핵심!)
  const [dragFromColumnId, setDragFromColumnId] = useState<string | null>(null);

  const activeCard = activeCardId ? findCardById(board, activeCardId) : null;

  const columnItems = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of board.columns) {
      map[col.id] = (col.cards ?? []).map((c) => c.id);
    }
    return map;
  }, [board]);

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (isColumnId(board, id)) return;

    const from = findColumnIdByCardId(board, id);
    setActiveCardId(id);
    setDragFromColumnId(from); // ✅ 시작 순간의 from 컬럼 확정
  };

  /**
   * ✅ 드래그 "중"에 컬럼이 바뀌면 즉시 낙관적 이동
   * (UI가 자연스럽게 움직이게)
   */
  const handleDragOver = (e: DragOverEvent) => {
    const activeId = String(e.active.id);
    const over = e.over;

    if (!over) return;
    if (isColumnId(board, activeId)) return;

    const fromColumnId = findColumnIdByCardId(board, activeId);
    if (!fromColumnId) return;

    const toColumnId = getOverColumnId(board, over);
    if (!toColumnId) return;

    if (fromColumnId === toColumnId) return;

    const overId = String(over.id);

    const next = cloneBoard(board);
    const fromCol = next.columns.find((c) => c.id === fromColumnId);
    const toCol = next.columns.find((c) => c.id === toColumnId);
    if (!fromCol || !toCol) return;

    const fromCards = fromCol.cards ?? [];
    const toCards = toCol.cards ?? [];

    const movingIdx = fromCards.findIndex((c) => c.id === activeId);
    if (movingIdx < 0) return;

    const [movingCard] = fromCards.splice(movingIdx, 1);

    // 드랍 위치: over가 컬럼이면 맨 뒤, over가 카드면 그 카드 위치
    let insertIndex = toCards.length;
    if (!isColumnId(board, overId)) {
      const overIndex = toCards.findIndex((c) => c.id === overId);
      if (overIndex >= 0) insertIndex = overIndex;
    }

    insertIndex = Math.min(Math.max(insertIndex, 0), toCards.length);
    toCards.splice(insertIndex, 0, movingCard);

    fromCol.cards = fromCards;
    toCol.cards = toCards;

    setBoard(next);
  };

  /**
   * ✅ 드랍 확정: DB 저장
   * - fromColumnId는 "드래그 시작 시점" 값(dragFromColumnId) 사용
   * - toPosition은 "active 카드 제외한 리스트" 기준으로 계산 (DB 기준과 맞춤)
   */
  const handleDragEnd = async (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const over = e.over;

    setActiveCardId(null);

    const fixedFromColumnId = dragFromColumnId;
    setDragFromColumnId(null);

    if (!over) return;
    if (isColumnId(board, activeId)) return;
    if (!fixedFromColumnId) return;

    const toColumnId = getOverColumnId(board, over);
    if (!toColumnId) return;

    const overId = String(over.id);

    // ✅ DB 기준 toPosition 계산:
    // 현재 UI에서는 active 카드가 이미 이동돼있을 수 있으니 "active 제외" 리스트로 index 계산
    const toCardsNoActive = getCardsExcludingActive(
      board,
      toColumnId,
      activeId
    );

    let toPosition = toCardsNoActive.length;
    if (!isColumnId(board, overId)) {
      const overIndex = toCardsNoActive.findIndex((c) => c.id === overId);
      if (overIndex >= 0) toPosition = overIndex;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/kanban/cards/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: activeId,
          fromColumnId: fixedFromColumnId, // ✅ 시작 순간 from 사용!
          toColumnId,
          toPosition,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        alert(`이동 저장 실패: ${res.status} ${res.statusText}\n${text}`);
        await refetchBoard();
        return;
      }

      await refetchBoard();
    } catch (err) {
      alert(`이동 저장 실패: ${String(err)}`);
      await refetchBoard();
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {board.columns.map((col) => (
          <KanbanColumn
            key={col.id}
            columnId={col.id}
            title={col.title}
            cardIds={columnItems[col.id] ?? []}
            cards={col.cards ?? []}
            onAddCard={() => onAddCard(col.id, col.title)}
            onEditCard={(card) => onEditCard(card, col.title)}
            onDeleteCard={(cardId, cardTitle) =>
              onDeleteCard(cardId, cardTitle, col.title)
            }
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
            <div className="font-medium">{activeCard.title}</div>
            {activeCard.description ? (
              <div className="mt-1 text-xs text-gray-500 dark:text-neutral-400 line-clamp-2">
                {activeCard.description}
              </div>
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  columnId,
  title,
  cardIds,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: {
  columnId: string;
  title: string;
  cardIds: string[];
  cards: KanbanCardLike[];
  onAddCard: () => void;
  onEditCard: (card: KanbanCardLike) => void;
  onDeleteCard: (cardId: string, cardTitle: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: "COLUMN", columnId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950 ${
        isOver ? "ring-2 ring-black/10 dark:ring-white/10" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{title}</div>
          <div className="text-xs text-gray-500 dark:text-neutral-400">
            {cards.length} cards
          </div>
        </div>

        <button
          onClick={onAddCard}
          className="shrink-0 rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-neutral-900"
          title="이 컬럼에 카드 추가"
        >
          + 카드 추가
        </button>
      </div>

      <div className="mt-3 grid gap-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card.id, card.title)}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="text-xs text-gray-500 dark:text-neutral-400">
            카드 없음
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCard({
  card,
  onEdit,
  onDelete,
}: {
  card: KanbanCardLike;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "CARD", cardId: card.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-gray-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-gray-900 dark:text-neutral-100 truncate">
            {card.title}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing rounded-md border px-2 py-1 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-neutral-800"
            title="드래그해서 이동"
          >
            ⠿
          </button>

          <button
            onClick={onEdit}
            className="rounded-md border px-2 py-1 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-neutral-800"
            title="카드 수정"
          >
            수정
          </button>
          <button
            onClick={onDelete}
            className="rounded-md border px-2 py-1 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="카드 삭제"
          >
            삭제
          </button>
        </div>
      </div>

      {card.description && (
        <div className="mt-1 text-xs text-gray-600 dark:text-neutral-300 line-clamp-2">
          {card.description}
        </div>
      )}
      {card.dueDate && (
        <div className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
          due: {new Date(card.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
