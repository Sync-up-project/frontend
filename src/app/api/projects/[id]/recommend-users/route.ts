import { NextResponse } from "next/server";

function getBackendBase() {
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://backend:3000"
  );
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backend = getBackendBase();
    const urlObj = new URL(req.url);
    const limit = urlObj.searchParams.get("limit");
    const url = `${backend}/projects/${params.id}/recommend-users${
      limit ? `?limit=${encodeURIComponent(limit)}` : ""
    }`;

    const cookie = req.headers.get("cookie") ?? "";
    const authorization = req.headers.get("authorization") ?? "";

    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(authorization ? { authorization } : {}),
        ...(cookie ? { cookie } : {}),
      },
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
        backendBase: getBackendBase(),
      },
      { status: 500 }
    );
  }
}
