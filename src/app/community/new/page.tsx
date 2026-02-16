import type { Metadata } from "next";
import CommunityWriteClient from "./CommunityWriteClient";

export const metadata: Metadata = {
  title: "글쓰기 | Sync Up",
  description: "커뮤니티 글 작성 페이지",
};

export default function CommunityWritePage() {
  return <CommunityWriteClient />;
}
