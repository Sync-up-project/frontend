"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { devLogin } from "@/lib/auth";

export default function DevLoginPage() {
  const router = useRouter();

  useEffect(() => {
    devLogin();
    router.replace("/projects");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-700">개발용 로그인 처리 중입니다.</p>
    </div>
  );
}
