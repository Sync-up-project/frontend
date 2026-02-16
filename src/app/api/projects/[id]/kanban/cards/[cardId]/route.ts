import { NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_BACKEND_URL ?? "http://backend:3000";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; cardId: string } }
) {
  const body = await req.text();
  const res = await fetch(
    `${BACKEND}/projects/${params.id}/kanban/cards/${params.cardId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body || "{}",
    }
  );

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; cardId: string } }
) {
  const res = await fetch(
    `${BACKEND}/projects/${params.id}/kanban/cards/${params.cardId}`,
    { method: "DELETE" }
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
