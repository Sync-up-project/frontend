import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backend = getInternalBackendUrl();
    const urlObj = new URL(req.url);
    const limit = urlObj.searchParams.get("limit");
    const url = `${backend}/projects/${params.id}/recommend-users${
      limit ? `?limit=${encodeURIComponent(limit)}` : ""
    }`;

    const cookie = req.headers.get("cookie") ?? "";
    const authorization =
      req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";

    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
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
        backendBase: getInternalBackendUrl(),
      },
      { status: 500 }
    );
  }
}
