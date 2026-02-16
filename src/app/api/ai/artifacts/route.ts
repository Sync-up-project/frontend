import { NextResponse } from "next/server";

function getBackendBase() {
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://backend:3000"
  );
}

export async function GET(req: Request) {
  try {
    const backend = getBackendBase();
    const url = new URL(req.url);

    const limit = url.searchParams.get("limit") ?? "20";
    const projectId = url.searchParams.get("projectId");

    const qs = new URLSearchParams();
    qs.set("limit", limit);
    if (projectId) qs.set("projectId", projectId);

    const res = await fetch(`${backend}/ai/artifacts?${qs.toString()}`, {
      cache: "no-store",
    });

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Proxy failed", detail: String(e) },
      { status: 500 }
    );
  }
}
