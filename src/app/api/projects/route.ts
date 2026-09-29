import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function GET(req: Request) {
  try {
    const backend = getInternalBackendUrl();
    const url = new URL(req.url);

    const target = joinUrl(backend, `/projects/list${url.search}`);

    const res = await fetch(target, {
      method: "GET",
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
      { error: "Proxy failed", detail: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const backend = getInternalBackendUrl();
    const target = joinUrl(backend, "/projects");

    const body = await req.text();

    const res = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
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
      { error: "Proxy failed", detail: String(e) },
      { status: 500 }
    );
  }
}