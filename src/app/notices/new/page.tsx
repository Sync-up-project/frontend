import type { Metadata } from "next";
import NoticeWriteClient from "./NoticeWriteClient";

export const metadata: Metadata = {
  title: "공지 작성 | Sync Up",
  description: "공지사항 작성 페이지",
};

export default function NoticeWritePage() {
  return <NoticeWriteClient />;
}
