import { NextResponse } from "next/server";

function getBackendBase() {
  // 도커 내부에선 backend:3000, 로컬에선 localhost:3001
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://backend:3000"
  );
}

export async function GET(
  _req: Request,
  context: { params: { jobId: string } }
) {
  const backend = getBackendBase();
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
