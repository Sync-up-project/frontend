/** 백엔드 GenerateProjectDto.openAiBundleModel 과 동일한 값이어야 합니다 */
export type OpenAiBundleModelId = "gpt-4.1-mini" | "gpt-4.1";

export const OPEN_AI_BUNDLE_MODEL_OPTIONS: Readonly<
  Array<{ id: OpenAiBundleModelId; label: string; description: string }>
> = [
  {
    id: "gpt-4.1-mini",
    label: "빠른 생성 (gpt-4.1-mini)",
    description: "기본값. 속도와 비용에 유리해요.",
  },
  {
    id: "gpt-4.1",
    label: "고품질 (gpt-4.1)",
    description: "더 풍부한 기획 초안을 기대할 때 선택해요.",
  },
];

export const DEFAULT_OPEN_AI_BUNDLE_MODEL: OpenAiBundleModelId =
  "gpt-4.1-mini";
