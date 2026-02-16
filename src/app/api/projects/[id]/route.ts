import { NextResponse } from "next/server";

function getBackendBase() {
  // 도커 내부에서 Next가 backend로 호출할 때는 INTERNAL_BACKEND_URL 우선
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://backend:3000"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const backend = getBackendBase();

  const res = await fetch(`${backend}/projects/${params.id}`, {
    cache: "no-store",
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
