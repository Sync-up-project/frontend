import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

const BACKEND = getInternalBackendUrl();

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; columnId: string } }
) {
  const body = await req.text();
  const res = await fetch(
    `${BACKEND}/projects/${params.id}/kanban/columns/${params.columnId}`,
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
  { params }: { params: { id: string; columnId: string } }
) {
  const res = await fetch(
    `${BACKEND}/projects/${params.id}/kanban/columns/${params.columnId}`,
    { method: "DELETE" }
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
