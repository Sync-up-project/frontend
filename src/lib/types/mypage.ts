export type MyPageUser = {
  id: string;
  nickname: string;
  email: string;
  role: "DEV" | "PLANNER" | "DESIGN";
  primaryLanguage: "KO" | "EN";
  createdAt: string;

  // UI 편의 필드 (PATCH 스펙 포함)
  profileImageUrl?: string;
  bio?: string;

  github: {
    username: string;
    url: string;
    isConnected: boolean;
  };
};

export type MyPageResponse = {
  user: MyPageUser;
};

export type UpdateMyPageBody = {
  nickname?: string;
  profileImageUrl?: string;
  bio?: string;
  primaryLanguage?: "KO" | "EN";
};

export type GithubStatsResponse = {
  stats: {
    totalCommits: number;
    publicRepos: number;
    recent1Week: number;
    recent1Month: number;
    topLangs: { name: string; percent: number }[];
  };
};

export type ProjectSummaryResponse = {
  summary: {
    createdProjects: number;
    appliedProjects: number;
    pendingApplications: number;
    acceptedApplications: number;
  };
};

export type CreatedProject = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  counts: {
    applications: number;
    hired: number;
  };
};

export type CreatedProjectsResponse = {
  items: CreatedProject[];
  page: number;
  size: number;
  total: number;
};

export type AppliedProject = {
  projectId: string;
  title: string;
  summary: string;
  myStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  appliedAt: string;
};

export type AppliedProjectsResponse = {
  items: AppliedProject[];
};