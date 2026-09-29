import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const backend = getInternalBackendUrl();
  const authorization = req.headers.get("authorization") ?? "";
  const body = await req.text();

  const res = await fetch(`${backend}/ai/artifacts/${params.id}/content`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { authorization } : {}),
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
}
