/** 드래프트 콘텐츠 PATCH에 허용되는 키만 포함합니다. */
export type DraftContentPatch = Partial<{
  ideaNormalized: unknown;
  screens: unknown;
  apiSpec: unknown;
  erd: unknown;
  questions: unknown;
}>;

export type DraftModalKey = keyof DraftContentPatch;
