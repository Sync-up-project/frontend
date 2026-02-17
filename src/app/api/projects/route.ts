// src/app/api/projects/route.ts

import { NextResponse } from "next/server";

function getBackendBase() {
  // ✅ 서버 내부 프록시 호출 우선
  // - INTERNAL_BACKEND_URL: docker/서버 내부에서 backend 서비스로 호출할 때
  // - NEXT_PUBLIC_API_BASE_URL: 로컬 개발에서 직접 호출할 때
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3001"
  );
}

export async function GET(req: Request) {
  const backend = getBackendBase();
  const url = new URL(req.url);

  const limit = url.searchParams.get("limit") ?? "20";

  const res = await fetch(`${backend}/projects?limit=${encodeURIComponent(limit)}`, {
    cache: "no-store",
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
