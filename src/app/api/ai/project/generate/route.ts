import { NextResponse } from "next/server";

function getBackendBase() {
  // 도커 내부에선 backend:3000, 로컬에선 localhost:3001
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://backend:3000"
  );
}

export async function POST(req: Request) {
  const backend = getBackendBase();
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
