import { NextResponse } from "next/server";

function getBackendBase() {
  // docker-compose 환경에서 frontend 컨테이너 -> backend 컨테이너 접근은
  // 서비스명 + 내부포트로 접근해야 합니다.
  // backend 컨테이너 내부 포트는 3000(외부는 3001로 매핑)
  return (
    process.env.INTERNAL_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://backend:3000"
  );
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const backend = getBackendBase();
    const url = `${backend}/projects/${params.id}`;

    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    // 백엔드의 content-type을 최대한 유지
    const contentType = res.headers.get("content-type") ?? "application/json";

    // 상태코드/바디 그대로 전달
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  } catch (e) {
    // 프록시 자체가 실패한 경우(주소 문제 등)
    return NextResponse.json(
      {
        error: "Proxy failed",
        detail: String(e),
        backendBase: getBackendBase(),
        hint:
          "docker 환경에서는 INTERNAL_BACKEND_URL=http://backend:3000 설정이 필요합니다.",
      },
      { status: 500 }
    );
  }
}
