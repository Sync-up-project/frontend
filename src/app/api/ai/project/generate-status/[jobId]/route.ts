import { NextResponse } from "next/server";
import { getInternalBackendUrl } from "@/lib/backendUrl";

export async function GET(
  _req: Request,
  context: { params: { jobId: string } }
) {
  const backend = getInternalBackendUrl();
  const { jobId } = context.params;

  const res = await fetch(`${backend}/ai/project/generate-status/${jobId}`, {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
