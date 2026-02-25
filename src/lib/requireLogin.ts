// src/lib/requireLogin.ts
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function alertAndGoLogin(router: AppRouterInstance, message: string) {
  if (typeof window !== "undefined") {
    alert(message);
  }
  router.replace("/login");
}

export function alertAndPushLogin(router: AppRouterInstance, message: string) {
  if (typeof window !== "undefined") {
    alert(message);
  }
  router.push("/login");
}