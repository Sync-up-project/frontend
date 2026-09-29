import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

const BACKEND = getInternalBackendUrl();

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const res = await fetch(`${BACKEND}/projects/${params.id}/kanban`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // init 생성/보장 같은 용도
  const body = await req.text();

  const res = await fetch(`${BACKEND}/projects/${params.id}/kanban/init`, {
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
