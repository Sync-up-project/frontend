import { NextResponse } from "next/server";

function getBackendBase() {
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://backend:3000"
  );
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backend = getBackendBase();
    const authorization =
      req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const cookie = req.headers.get("cookie") ?? "";
    const body = await req.text();

    const res = await fetch(`${backend}/projects/${params.id}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
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
      { error: "Proxy failed", detail: String(e), backendBase: getBackendBase() },
      { status: 500 }
    );
  }
}
