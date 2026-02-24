import type {
  MyPageResponse,
  GithubStatsResponse,
  ProjectSummaryResponse,
  CreatedProjectsResponse,
  AppliedProjectsResponse,
} from "@/lib/types/mypage";

export const mockMyPage: MyPageResponse = {
  user: {
    id: "usr_1",
    nickname: "HB_Kwon",
    email: "khbin04@gmail.com",
    role: "DEV",
    primaryLanguage: "KO",
    createdAt: "2025-12-07T00:00:00.000Z",
    profileImageUrl: "",
    bio: "안녕하세요. SyncUp 프로젝트를 진행 중인 개발자입니다.",
    github: {
      username: "HB-KWon",
      url: "https://github.com/HB-KWon",
      isConnected: true,
    },
  },
};

export const mockGithubStats: GithubStatsResponse = {
  stats: {
    totalCommits: 123,
    publicRepos: 10,
    recent1Week: 7,
    recent1Month: 30,
    topLangs: [
      { name: "TypeScript", percent: 55 },
      { name: "Python", percent: 20 },
      { name: "CSS", percent: 15 },
      { name: "Other", percent: 10 },
    ],
  },
};

export const mockProjectSummary: ProjectSummaryResponse = {
  summary: {
    createdProjects: 1,
    appliedProjects: 1,
    pendingApplications: 1,
    acceptedApplications: 0,
  },
};

export const mockCreatedProjects: CreatedProjectsResponse = {
  items: [
    {
      id: "prj_1",
      title: "디자이너, 기획자 모집합니다",
      summary: "캡스톤 디자인 프로젝트 팀원을 모집합니다.",
      createdAt: "2025-12-09T00:00:00.000Z",
      counts: {
        applications: 0,
        hired: 0,
      },
    },
  ],
  page: 1,
  size: 10,
  total: 1,
};

export const mockAppliedProjects: AppliedProjectsResponse = {
  items: [
    {
      projectId: "prj_2",
      title: "프로젝트 제목",
      summary: "요약",
      myStatus: "PENDING",
      appliedAt: "2025-12-10T00:00:00.000Z",
    },
  ],
};