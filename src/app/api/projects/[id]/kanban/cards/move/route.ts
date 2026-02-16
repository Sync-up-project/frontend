import { NextResponse } from "next/server";

const BACKEND = process.env.INTERNAL_BACKEND_URL ?? "http://backend:3000";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.text();
  const res = await fetch(
    `${BACKEND}/projects/${params.id}/kanban/cards/move`,
    {
      method: "POST",
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
