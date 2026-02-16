"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAccessToken } from "@/lib/auth";

export default function DevLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    clearAccessToken();
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-700">개발용 로그아웃 처리 중입니다.</p>
    </div>
  );
}
