"use client";

import { KanbanBoardData } from "@/lib/kanban/types";

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function Card({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="font-semibold">{title}</div>
      {description ? (
        <div className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
          {description}
        </div>
      ) : null}
    </div>
  );
}

export default function KanbanBoard({ data }: { data: KanbanBoardData }) {
  const { columns, cards } = data;

  const renderColumn = (key: "todo" | "doing" | "done") => (
    <Column title={columns[key].title}>
      {columns[key].cardIds.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-xs text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
          카드가 없어요 🙂
        </div>
      ) : (
        columns[key].cardIds.map((id) => (
          <Card
            key={id}
            title={cards[id]?.title ?? "Untitled"}
            description={cards[id]?.description}
          />
        ))
      )}
    </Column>
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {renderColumn("todo")}
      {renderColumn("doing")}
      {renderColumn("done")}
    </div>
  );
}
