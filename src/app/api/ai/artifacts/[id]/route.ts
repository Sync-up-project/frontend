import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const backend =
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://backend:3000";
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
