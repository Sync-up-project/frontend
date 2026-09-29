import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const backend = getInternalBackendUrl();
  const body = await req.json();
  const res = await fetch(`${backend}/ai/artifacts/${params.id}/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
