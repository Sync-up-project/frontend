import type { Metadata } from "next";
import NoticeDetailClient from "./NoticeDetailClient";

export const metadata: Metadata = {
  title: "공지 상세 | Sync Up",
  description: "공지사항 상세 페이지",
};

export default function NoticeDetailPage() {
  return <NoticeDetailClient />;
}
