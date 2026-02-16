// src/lib/types/mypage.ts

export type MyPageRole = "DEV" | "DESIGN" | "PM" | string;
export type PrimaryLanguage = "KO" | "JA" | "EN" | string;

// =====================
// /mypage
// =====================

export type MyPageGithub = {
  username: string;
  url: string;
  isConnected: boolean;
};

export type MyPageUser = {
  id: string | number;
  nickname: string;
  email: string;
  role: MyPageRole;
  primaryLanguage: PrimaryLanguage;
  createdAt: string; // ISO
  github: MyPageGithub;
};

export type GetMyPageResponse = {
  user: MyPageUser;
};

export type PatchMyPageRequest = {
  nickname: string;
  profileImageUrl: string;
  bio: string;
  primaryLanguage: PrimaryLanguage;
};

// 응답 예시가 없어서 void로 둡니다(보통 200/204).
export type PatchMyPageResponse = void;

export type GithubTopLang = {
  name: string;
  percent: number;
};

export type GithubStats = {
  totalCommits: number;
  publicRepos: number;
  recent1Week: number;
  recent1Month: number;
  topLangs: GithubTopLang[];
};

export type GetMyPageGithubStatsResponse = {
  stats: GithubStats;
};

export type ProjectsSummary = {
  createdProjects: number;
  appliedProjects: number;
  pendingApplications: number;
  acceptedApplications: number;
};

export type GetMyPageProjectsSummaryResponse = {
  summary: ProjectsSummary;
};

export type CreatedProjectCounts = {
  applications: number;
  hired: number;
};

export type CreatedProjectItem = {
  id: string;
  title: string;
  summary: string;
  createdAt: string; // ISO
  counts: CreatedProjectCounts;
};

export type GetMyPageProjectsCreatedResponse = {
  items: CreatedProjectItem[];
  page: number;
  size: number;
  total: number;
};

export type AppliedProjectItem = {
  projectId: string;
  title: string;
  summary: string;
  myStatus: "PENDING" | "ACCEPTED" | "REJECTED" | string;
  appliedAt: string; // ISO
};

export type GetMyPageProjectsAppliedResponse = {
  items: AppliedProjectItem[];
};

// =====================
// /users/mypage
// =====================

export type GetUsersMyPageResponse = {
  id: number;
  email: string;
  nickname: string;
  stacks: string[];
};

export type PatchUsersMyPageRequest = {
  id: number;
  nickname: string;
};

export type PatchUsersMyPageResponse = {
  nickname: string;
};
