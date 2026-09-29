import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function POST(req: Request) {
  const backend = getInternalBackendUrl();
  const body = await req.json();

  const res = await fetch(`${backend}/ai/project/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  // Nest가 JSON 못 주면(에러)도 그대로 전달하기 위해 text로 받음
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
