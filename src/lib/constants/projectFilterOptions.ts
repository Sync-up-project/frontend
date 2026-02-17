// src/lib/constants/projectFilterOptions.ts

export const PROJECT_FILTER_STACKS = [
  "React",
  "TypeScript",
  "Node.js",
  "WebSocket",
  "Python",
  "TensorFlow",
  "React Native",
] as const;

export const PROJECT_FILTER_TOOLS = ["Notion", "Figma", "Miro", "GitHub", "Jira"] as const;

export type ProjectFilterStack = (typeof PROJECT_FILTER_STACKS)[number];
export type ProjectFilterTool = (typeof PROJECT_FILTER_TOOLS)[number];
