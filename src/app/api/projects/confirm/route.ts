import { NextResponse } from "next/server";

function getBackendBase() {
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001"
  );
}

export async function POST(req: Request) {
  const backend = getBackendBase();
  const body = await req.json();
  const authorization =
    req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";

  const res = await fetch(`${backend}/projects/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
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
