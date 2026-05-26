// src/app/projects/ProjectsClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { getAccessToken } from "@/lib/auth";
import {
  apiGetProjectsList,
  apiGetProjectsRecommend,
  apiGetProjectsWishlist,
} from "@/lib/api";

import ProjectFilters, { FilterState, DevPosition } from "./components/ProjectFilters";
import ProjectList, { ProjectItem } from "./components/ProjectList";
import ProjectSidebar, { SidebarProject } from "./components/ProjectSidebar";
import GuestSidebar from "./components/GuestSidebar";

import type {
  ProjectListResponse,
  ProjectRecommendResponse,
  ProjectWishlistResponse,
  TechStack,
} from "@/lib/types/project";

function normalizeTechName(name: string) {
  const n = (name ?? "").trim();
  if (!n) return n;
  return n;
}

function mapPositionNeedsToDevPosition(
  positionNeeds: { position: string }[] | undefined
): DevPosition {
  const pos = new Set((positionNeeds ?? []).map((p) => (p.position ?? "").toUpperCase()));

  // 임시 매핑(기존 UI 필터에 맞춤)
  if (pos.has("DEV") && pos.has("DESIGN")) return "fullstack";
  if (pos.has("DEV")) return "backend";
  if (pos.has("DESIGN")) return "frontend";
  return "all";
}

function includesAll(hay: string[], needles: string[]) {
  if (needles.length === 0) return true;
  const set = new Set(hay.map((v) => v.toLowerCase()));
  return needles.every((n) => set.has(n.toLowerCase()));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeTechNames(techStacks: TechStack[] | undefined) {
  return (techStacks ?? []).map((t) => normalizeTechName(t.name)).filter(Boolean);
}

function sumHeadcount(positionNeeds: any[] | undefined): number {
  const arr = positionNeeds ?? [];
  return arr.reduce((acc, cur) => {
    const n = Number(cur?.headcount ?? cur?.count ?? 0);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * ✅ 백엔드 응답이 items 기반(스크린샷)인데,
 * 프론트 타입/구현이 project 기반인 경우가 섞여 있을 수 있어
 * items / project 둘 다 대응합니다.
 */
function pickArray<T = any>(res: any): T[] {
  const items = res?.items;
  const project = res?.project;

  if (Array.isArray(items)) return items as T[];
  if (Array.isArray(project)) return project as T[];
  return [];
}

/**
 * ✅ 추천/찜 엔드포인트가 아직 백엔드에 없어서(404) 네트워크 에러가 계속 뜨는 상태라면
 * 아래 플래그를 켜기 전까지는 호출을 막아두는 편이 개발 경험이 좋습니다.
 *
 * - 백엔드가 /projects/recommend, /projects/wishlist 구현되면 true로 바꾸거나
 * - NEXT_PUBLIC_ENABLE_PROJECT_SIDE_API=true 환경변수를 설정하세요.
 */
const ENABLE_PROJECT_SIDE_API =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_ENABLE_PROJECT_SIDE_API === "true"
    : false;

export default function ProjectsClient() {
  const { tr } = useI18n();
  const router = useRouter();

  const [filters, setFilters] = useState<FilterState>({
    position: "all",
    stacks: [],
    tools: [],
  });

  // Hydration-safe auth flag
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    const sync = () => setIsAuthed(Boolean(getAccessToken()));
    sync();
    window.addEventListener("auth:changed", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
    };
  }, []);

  // Main list data
  const [list, setList] = useState<ProjectItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Sidebar data
  const [recommended, setRecommended] = useState<SidebarProject[]>([]);
  const [bookmarked, setBookmarked] = useState<SidebarProject[]>([]);
  const [loadingSide, setLoadingSide] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // 1) Load project list
  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoadingList(true);
      setListError(null);

      try {
        const res: ProjectListResponse = await apiGetProjectsList();

        // ✅ 핵심 수정: res.project가 아니라 res.items(또는 project) 배열을 꺼내서 맵핑
        const raw = pickArray<any>(res);

        const mapped: ProjectItem[] = raw.map((p) => {
          const tags = safeTechNames(p?.techStacks);
          const position = mapPositionNeedsToDevPosition(p?.positionNeeds);

          const currentCount = Number(
            p?.membersCount ?? p?.members_count ?? p?.members ?? p?.membersCountCurrent ?? 0
          );

          // 백엔드 스크린샷 기준 capacity가 전체 모집 인원처럼 보이므로 우선순위 높게
          const totalCount = Number(
            p?.capacity ??
              p?.membersCountMax ??
              p?.members_max ??
              p?.maxMembers ??
              sumHeadcount(p?.positionNeeds) ??
              0
          );

          return {
            id: String(p?.id ?? ""),
            // 스펙에 따라 titleOriginal/summaryOriginal 같이 올 수도 있어서 폭넓게 대응
            title: String(p?.titleOriginal ?? p?.title ?? ""),
            description: String(p?.summaryOriginal ?? p?.summary ?? p?.descriptionOriginal ?? ""),
            position,
            tags,
            currentCount: Number.isFinite(currentCount) ? currentCount : 0,
            totalCount: Number.isFinite(totalCount) ? totalCount : 0,
          };
        });

        if (!mounted) return;
        setList(mapped);
      } catch (e: any) {
        if (!mounted) return;
        setList([]);
        setListError(e?.message ?? "프로젝트 목록을 불러오지 못했습니다.");
      } finally {
        if (!mounted) return;
        setLoadingList(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Load sidebar (recommend / wishlist) when authed
  useEffect(() => {
    let mounted = true;

    async function run() {
      const token = getAccessToken();
      if (!token) {
        setRecommended([]);
        setBookmarked([]);
        return;
      }

      // ✅ 백엔드 엔드포인트가 없는 상태(404)면 아예 호출하지 않도록
      if (!ENABLE_PROJECT_SIDE_API) {
        setRecommended([]);
        setBookmarked([]);
        return;
      }

      setLoadingSide(true);
      try {
        const [rec, wish]: [ProjectRecommendResponse, ProjectWishlistResponse] =
          await Promise.all([apiGetProjectsRecommend(), apiGetProjectsWishlist()]);

        if (!mounted) return;

        const recProjects = pickArray<any>(rec);
        const wishProjects = pickArray<any>(wish);

        setRecommended(
          recProjects.map((p) => ({
            id: String(p?.id ?? ""),
            title: String(p?.titleOriginal ?? p?.title ?? ""),
            membersText: "",
            tags: safeTechNames(p?.techStacks),
          }))
        );

        setBookmarked(
          wishProjects.map((p) => ({
            id: String(p?.id ?? ""),
            title: String(p?.titleOriginal ?? p?.title ?? ""),
            membersText: "",
            tags: safeTechNames(p?.techStacks),
          }))
        );
      } catch {
        if (!mounted) return;
        setRecommended([]);
        setBookmarked([]);
      } finally {
        if (!mounted) return;
        setLoadingSide(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [isAuthed]);

  // filter reset page
  useEffect(() => {
    setPage(1);
  }, [filters.position, filters.stacks, filters.tools]);

  // Apply filters
  const filteredAll: ProjectItem[] = useMemo(() => {
    return list.filter((p) => {
      const posOk = filters.position === "all" ? true : p.position === filters.position;
      const stacksOk = includesAll(p.tags, filters.stacks);
      const toolsOk = includesAll(p.tags, filters.tools);
      return posOk && stacksOk && toolsOk;
    });
  }, [list, filters.position, filters.stacks, filters.tools]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredAll.length / pageSize);
    return Math.max(1, pages);
  }, [filteredAll.length]);

  const currentPage = clamp(page, 1, totalPages);

  const pagedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAll.slice(start, end);
  }, [filteredAll, currentPage]);

  const pageButtons = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );

  function requireLoginThen(to: string) {
    if (isAuthed) {
      router.push(to);
      return;
    }
    alert(tr("로그인이 필요한 기능입니다.", "ログインが必要な機能です。"));
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <div className="max-w-screen-2xl mx-auto px-8 py-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tr("프로젝트", "プロジェクト")}</h1>
            <p className="text-sm text-gray-600 dark:text-white/70 mt-1">
              {tr(
                "원하는 스택과 역할로 참여할 프로젝트를 찾아보세요.",
                "希望のスタックと役割で参加するプロジェクトを探しましょう。"
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => requireLoginThen("/projects/manage")}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
            >
              {tr("프로젝트 관리", "プロジェクト管理")}
            </button>

            <button
              type="button"
              onClick={() => requireLoginThen("/projects/create")}
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
            >
              {tr("프로젝트 생성", "プロジェクト作成")}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[190px_minmax(0,1fr)_270px]">
          <div className="min-w-0">
            <ProjectFilters value={filters} onChange={setFilters} />
          </div>

          <div className="min-w-0">
            {loadingList ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                {tr("불러오는 중...", "読み込み中...")}
              </div>
            ) : listError ? (
              <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700 dark:bg-white/5 dark:border-red-500/30 dark:text-red-200">
                {tr("목록을 불러오지 못했습니다.", "一覧の取得に失敗しました。")}
                <div className="mt-2 text-xs text-red-600 dark:text-red-200/80 break-words">{listError}</div>
              </div>
            ) : (
              <>
                <ProjectList projects={pagedProjects} />

                {filteredAll.length > 0 ? (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <p className="text-xs text-gray-500 dark:text-white/60 text-center">
                      {tr("총", "合計")}{" "}
                      <span className="font-semibold text-gray-700 dark:text-white/80">{filteredAll.length}</span>
                      {tr("개", "件")} · {tr("페이지", "ページ")}{" "}
                      <span className="font-semibold text-gray-700 dark:text-white/80">{currentPage}</span> /{" "}
                      <span className="font-semibold text-gray-700 dark:text-white/80">{totalPages}</span>
                    </p>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
                        disabled={currentPage === 1}
                        className={[
                          "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                          currentPage === 1
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white/30"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10",
                        ].join(" ")}
                      >
                        {tr("이전", "前へ")}
                      </button>

                      <div className="flex items-center gap-1">
                        {pageButtons.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPage(n)}
                            className={[
                              "w-9 h-9 rounded-lg text-sm font-semibold border transition-colors",
                              n === currentPage
                                ? "border-gray-900 bg-gray-900 text-white dark:border-white/10 dark:bg-white dark:text-slate-950"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10",
                            ].join(" ")}
                            aria-label={tr(`${n}페이지`, `${n}ページ`)}
                          >
                            {n}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={[
                          "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                          currentPage === totalPages
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-white/10 dark:bg-white/5 dark:text-white/30"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10",
                        ].join(" ")}
                      >
                        {tr("다음", "次へ")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="min-w-0">
            {isAuthed ? (
              <ProjectSidebar
                recommended={recommended}
                bookmarked={bookmarked}
                loading={loadingSide}
              />
            ) : (
              <GuestSidebar />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
