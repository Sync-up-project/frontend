import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

const BACKEND = getInternalBackendUrl();

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.text();
  const res = await fetch(`${BACKEND}/projects/${params.id}/kanban/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body || "{}",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
