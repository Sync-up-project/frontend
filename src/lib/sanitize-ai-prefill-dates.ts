/** 드래프트 날짜 미리채우기: 서버와 동일하게 서울 캘린더 기준, 과거는 기본 오프셋으로 보정 */

const SEOUL_TZ = "Asia/Seoul";

export function seoulCalendarTodayYyyyMmDd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function extractYyyyMmDd(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function addCalendarDays(yyyyMmDd: string, deltaDays: number): string {
  const [y, mo, d] = yyyyMmDd.split("-").map((n) => Number(n));
  const t = Date.UTC(y, mo - 1, d, 12, 0, 0);
  const next = new Date(t + deltaDays * 86400000);
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 모집·종료 한 쌍: 둘 다 미래로 맞추고 모집 ≤ 종료 */
export function pairRecruitAndEndPrefill(
  recruitRaw: unknown,
  endRaw: unknown,
  deadlineRaw: unknown
): { recruit: string; end: string } {
  const today = seoulCalendarTodayYyyyMmDd();
  let end =
    extractYyyyMmDd(endRaw) ?? extractYyyyMmDd(deadlineRaw) ?? null;
  let recruit = extractYyyyMmDd(recruitRaw);

  if (!end || end < today) end = addCalendarDays(today, 56);
  if (!recruit || recruit < today) recruit = addCalendarDays(today, 14);
  if (end < recruit) end = addCalendarDays(recruit, 28);

  return { recruit, end };
}
