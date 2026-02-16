import type { Metadata } from "next";
import CommunityDetailClient from "./CommunityDetailClient";

export const metadata: Metadata = {
  title: "게시글 | Sync Up",
  description: "커뮤니티 게시글 상세",
};

export default function CommunityDetailPage() {
  return <CommunityDetailClient />;
}
