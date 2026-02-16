// src/lib/types/projects.ts

export type TechStack = {
  id: string;
  name: string;
};

export type PositionNeed = {
  id: string;
  position: string; // 예: "DEV", "DESIGN"
};

export type MainImageResponse = {
  imageUrl: string;
};

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
  LIKE: string; // 스펙이 "true" 문자열
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
