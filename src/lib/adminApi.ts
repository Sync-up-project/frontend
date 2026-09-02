import { authedGet } from "@/lib/auth";

export type AdminOverview = {
  totalUsers: number;
  adminUsers: number;
  totalProjects: number;
  activeProjects: number;
  communityPosts: number;
  notices: number;
};

export type AdminListResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  nickname: string | null;
  role: string | null;
  accountRole: string;
  primaryLanguage: string;
  githubUsername: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    ownedProjects: number;
    memberships: number;
    communityPosts: number;
  };
};

export type AdminProject = {
  id: string;
  titleOriginal: string;
  summaryOriginal: string;
  status: string;
  difficulty: string;
  mode: string;
  capacity: number;
  createdAt: string;
  owner: {
    id: string;
    email: string | null;
    nickname: string | null;
  };
  _count: {
    members: number;
    applications: number;
    invitations: number;
  };
};

export type AdminCommunityPost = {
  id: string;
  category: string;
  titleOriginal: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    email: string | null;
    nickname: string | null;
  };
};

export type AdminNotice = {
  id: string;
  pinned: boolean;
  titleOriginal: string;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    email: string | null;
    nickname: string | null;
  };
};

export type AdminAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  diffJson: unknown;
  createdAt: string;
  actor: {
    id: string;
    email: string | null;
    nickname: string | null;
    accountRole: string;
  } | null;
  project: {
    id: string;
    titleOriginal: string;
  } | null;
};

function query(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") usp.set(key, String(value));
  });
  const text = usp.toString();
  return text ? `?${text}` : "";
}

export function getAdminOverview() {
  return authedGet<AdminOverview>("/admin/overview");
}

export function getAdminUsers(params: { q?: string } = {}) {
  return authedGet<AdminListResponse<AdminUser>>(
    `/admin/users${query({ q: params.q, limit: 30 })}`,
  );
}

export function getAdminProjects(params: { q?: string } = {}) {
  return authedGet<AdminListResponse<AdminProject>>(
    `/admin/projects${query({ q: params.q, limit: 30 })}`,
  );
}

export function getAdminCommunityPosts(params: { q?: string } = {}) {
  return authedGet<AdminListResponse<AdminCommunityPost>>(
    `/admin/community-posts${query({ q: params.q, limit: 30 })}`,
  );
}

export function getAdminNotices(params: { q?: string } = {}) {
  return authedGet<AdminListResponse<AdminNotice>>(
    `/admin/notices${query({ q: params.q, limit: 30 })}`,
  );
}

export function getAdminAuditLogs() {
  return authedGet<AdminListResponse<AdminAuditLog>>("/admin/audit-logs?limit=50");
}
