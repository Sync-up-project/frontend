import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const backend = getInternalBackendUrl();
  const res = await fetch(`${backend}/ai/artifacts/${params.id}`, {
    cache: "no-store",
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
