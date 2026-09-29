import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backend = getInternalBackendUrl();
    const authorization =
      req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
    const cookie = req.headers.get("cookie") ?? "";
    const body = await req.text();

    const res = await fetch(`${backend}/applications/${params.id}`, {
      method: "PATCH",
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
      { error: "Proxy failed", detail: String(e), backendBase: getInternalBackendUrl() },
      { status: 500 }
    );
  }
}
