export type DisplayUser = {
  displayName: string;      // 화면에 보여줄 이름(깃허브 우선 적용)
  nickname?: string;        // 서비스 닉네임(있으면)
  email?: string;
  role?: string;
  primaryLanguage?: string;

  github?: {
    isConnected: boolean;
    username?: string;
    url?: string;
    avatarUrl?: string;
  };

  avatarUrl?: string;       // 최종 프로필 이미지(깃허브 우선 fallback 적용)
};

/**
 * 어떤 형태의 user 객체가 오더라도 DisplayUser로 정규화합니다.
 * - /auth/me 응답이든 /mypage 응답이든 대응
 * - GitHub 연동 시 username/avatarUrl 우선 규칙 적용
 */
export function normalizeDisplayUser(input: any): DisplayUser | null {
  const user = input?.user ?? input; // {user:{...}} 또는 {...} 둘 다 처리
  if (!user) return null;

  const github = user.github ?? null;

  const githubIsConnected =
    Boolean(github?.isConnected) ||
    Boolean(user.githubUsername) ||
    Boolean(github?.username);

  const githubUsername =
    safeStr(github?.username) || safeStr(user.githubUsername) || undefined;

  const githubUrl =
    safeStr(github?.url) || safeStr(user.githubUrl) || undefined;

  const githubAvatarUrl =
    safeStr(github?.avatarUrl) ||
    safeStr(user.githubAvatarUrl) ||
    safeStr(user.avatarUrl) ||
    undefined;

  const nickname =
    safeStr(user.nickname) || safeStr(user.name) || safeStr(user.username) || undefined;

  // ✅ 표시명: GitHub username 우선
  const displayName = githubIsConnected && githubUsername ? githubUsername : (nickname ?? "");

  // 프로필 이미지: profileImageUrl 우선이 있으면 사용,
  // 없으면 GitHub avatarUrl 우선,
  // avatarUrl도 없으면 GitHub png fallback 생성
  const profileImageUrl =
    safeStr(user.profileImageUrl) || safeStr(user.profile_image_url) || undefined;

  const avatarUrl =
    profileImageUrl ||
    githubAvatarUrl ||
    (githubUsername ? githubPngUrl(githubUsername) : undefined);

  return {
    displayName,
    nickname,
    email: safeStr(user.email) || undefined,
    role: safeStr(user.role) || undefined,
    primaryLanguage: safeStr(user.primaryLanguage) || safeStr(user.primary_language) || undefined,
    github: {
      isConnected: githubIsConnected,
      username: githubUsername,
      url: githubUrl,
      avatarUrl: githubAvatarUrl,
    },
    avatarUrl,
  };
}

export function getLanguageBadge(lang: string | null | undefined): string {
  // 내부 i18n은 보통 ko/ja, UI 표시는 KO/JA 권장
  if (!lang) return "";
  if (lang === "ko" || lang === "KO") return "KO";
  if (lang === "ja" || lang === "JA") return "JA";
  if (lang === "en" || lang === "EN") return "EN";
  return String(lang).toUpperCase();
}

function safeStr(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function githubPngUrl(username: string): string {
  return `https://github.com/${encodeURIComponent(username)}.png`;
}