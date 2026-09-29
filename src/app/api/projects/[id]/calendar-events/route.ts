import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backend = getInternalBackendUrl();
    const u = new URL(req.url);
    const qs = u.search ? u.search : "";
    const url = `${backend}/projects/${params.id}/calendar-events${qs}`;

    const cookie = req.headers.get("cookie") ?? "";
    const authorization = req.headers.get("authorization") ?? "";

    const res = await fetch(url, {
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
        backendBase: getInternalBackendUrl(),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backend = getInternalBackendUrl();
    const url = `${backend}/projects/${params.id}/calendar-events`;

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
        backendBase: getInternalBackendUrl(),
      },
      { status: 500 }
    );
  }
}

