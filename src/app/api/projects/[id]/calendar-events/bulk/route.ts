import { NextResponse } from "next/server";

function getBackendBase() {
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://backend:3000"
  );
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const backend = getBackendBase();
    const url = `${backend}/projects/${encodeURIComponent(params.id)}/calendar-events/bulk`;

    const cookie = req.headers.get("cookie") ?? "";
    const authorization = req.headers.get("authorization") ?? "";
    const body = await req.text();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorization ? { authorization } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body,
      cache: "no-store",
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "application/json";
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Proxy failed",
        detail: String(e),
      },
      { status: 500 }
    );
  }
}
