// src/app/dev-login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { devLogin } from "@/lib/auth";

export default function DevLoginPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      devLogin();
      router.replace("/projects");
    } catch {
      // DEV_AUTH가 꺼져 있으면 일반 로그인 페이지로 보냅니다.
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-700">개발용 로그인 처리 중입니다.</p>
    </div>
  );
}
