// src/lib/types/projects.ts

export type TechStack = {
  id: string;
  name: string;
};

export type PositionNeed = {
  id: string;
  position: string;
};

export type ProjectStatus =
  | "PLANNING"
  | "RECRUITING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | string;

/* ===============================
   LIST / RECOMMEND / WISHLIST
================================ */

export type ProjectListItem = {
  id: string;
  title: string;
  summary: string;
  ownerId: string;
  nickname: string;
  techStacks: TechStack[];
  endDate: string;
  positionNeeds: PositionNeed[];
  membersCount: number;
  membersCountMax: number;
  LIKE: string;
};

export type ProjectListResponse = {
  project: ProjectListItem[];
};

export type RecommendProjectItem = {
  id: string;
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
};

export type ProjectRecommendResponse = {
  project: RecommendProjectItem[];
  techStacks: TechStack[];
};

export type ProjectWishlistResponse = {
  project: RecommendProjectItem[];
  techStacks: TechStack[];
};

/* ===============================
   MANAGEMENT
================================ */

export type ProjectManagementProject = {
  id: string;
  title: string;
  summary: string;
  description: string;
  statusId: number;
  status: ProjectStatus;
  deadline: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  ownerNickname: string;
  profileImageUrl: string | null;
};

export type CurrentMember = {
  id: string;
  nickname: string;
};

export type RecommendUser = {
  id: string;
  nickname: string;
  position: string;
  techStack: TechStack[];
  matchingPoint: number;
};

export type ProjectManagementResponse = {
  project: ProjectManagementProject;
  techStacks: TechStack[];
  positionNeeds: PositionNeed[];
  membersCount: number;
  membersCountMax: number;
  currentMember: CurrentMember[];
  recommendUser: RecommendUser[];
};

/* ===============================
   DETAIL
================================ */

export type ProjectDetailResponse = {
  project: {
    id: string;
    title: string;
    summary: string;
    description: string;
    difficulty: string;
    status: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    owner: {
      id: string;
      nickname: string;
      profileImageUrl: string | null;
    };
    techStacks: TechStack[];
    positionNeeds: {
      position: string;
      headcount: number;
      remaining: number;
    }[];
    membersCount: number;
    myApplicationStatus: string;
  };
};

export type ProjectSimilarResponse = {
  items: {
    id: string;
    title: string;
    summary: string;
    mainImageUrl: string | null;
  }[];
};

/* ===============================
   REQUEST DTO
================================ */

export type PatchProjectStatusRequest = {
  project: {
    id: string;
    statusId: number;
  };
};

export type PatchProjectManagementRequest = {
  project: {
    id: string;
    title: string;
    summary: string;
    description: string;
    deadline: string;
    startDate: string;
    profileImageUrl: string | null;
  };
  techStacks: TechStack[];
  positionNeeds: PositionNeed[];
  membersCountMax: number;
};

export type DeleteProjectMemberRequest = {
  project: {
    id: string;
    userId: string;
  };
};

export type DeleteProjectManagementRequest = {
  project: {
    id: string;
  };
};

export type PostProjectMailRequest = {
  project: {
    id: string;
    userId: string;
  };
};
