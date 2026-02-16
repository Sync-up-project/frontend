import { NextResponse } from "next/server";

function getBackendBase() {
  // ✅ 도커/서버 내부 호출 우선
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://backend:3000"
  );
}

export async function GET(req: Request) {
  const backend = getBackendBase();
  const url = new URL(req.url);

  const limit = url.searchParams.get("limit") ?? "20";

  const res = await fetch(
    `${backend}/projects?limit=${encodeURIComponent(limit)}`,
    {
      cache: "no-store",
    }
  );

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
