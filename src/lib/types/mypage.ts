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
// ✅ api.ts 호환용 추가 타입들
// - src/lib/api.ts에서 import 하는 타입 이름이 현재 파일에 없어서 TS 에러가 발생했음
// - 백엔드 스펙이 확정되면 필드/타입을 실제 DTO에 맞게 조정하세요.
// =====================

/**
 * 언어 수정(/mypage/languages)
 * - 서버가 primaryLanguage만 받는 구조면 primaryLanguage만 사용
 * - 서버가 여러 언어를 받는 구조면 languages도 사용 가능
 */
export type PatchMyPageLangRequest = {
  primaryLanguage?: PrimaryLanguage;
  languages?: PrimaryLanguage[];
};

/**
 * 기술 스택 수정(/mypage/teches)
 * - 백엔드가 techStackIds만 받는지, name 기반인지 불명확하므로 둘 다 허용
 */
export type PatchMyPageTechesRequest = {
  techStackIds?: Array<string | number>;
  techNames?: string[];
  teches?: Array<{
    techStackId?: string | number;
    name?: string;
    level?: string;
    years?: number;
  }>;
};

/**
 * 포지션 수정(/mypage/positions)
 */
export type PatchMyPagePositionsRequest = {
  positions: Array<MyPageRole | string>;
};

/**
 * 프로젝트 관련 수정(/mypage/projects)
 * - 관심/참여 프로젝트 id 목록 등 확정되기 전까지 넓게 허용
 */
export type PatchMyPageProjectsRequest = {
  projectIds?: Array<string | number>;
  projects?: Array<{
    id: string | number;
    title?: string;
    roleInProject?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
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
