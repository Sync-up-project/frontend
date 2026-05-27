import { NextResponse } from "next/server";

function getBackendBase() {
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://backend:3000"
  );
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const backend = getBackendBase();
    const authorization = req.headers.get("authorization") ?? "";
    const cookie = req.headers.get("cookie") ?? "";
    const body = await req.json();

    const res = await fetch(`${backend}/ai/projects/${encodeURIComponent(params.id)}/schedule-draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { authorization } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return new NextResponse(text, {
        status: res.status,
        headers: {
          "content-type": res.headers.get("content-type") ?? "text/plain",
        },
      });
    }
  } catch (e) {
    return NextResponse.json(
      { message: "Proxy failed", detail: String(e) },
      { status: 500 }
    );
  }
}
