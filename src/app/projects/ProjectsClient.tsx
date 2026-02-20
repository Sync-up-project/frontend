// src/app/projects/ProjectsClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  // 현재 UI 필터(DevPosition)가 frontend/backend/fullstack/all 중 하나로 보이는 구조라,
  // 임시 매핑: DEV만 있으면 backend, DESIGN만 있으면 frontend, 둘 다면 fullstack
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

export default function ProjectsClient() {
  const { tr } = useI18n();

  const [filters, setFilters] = useState<FilterState>({
    position: "all",
    stacks: [],
    tools: [],
  });

  // Hydration-safe auth flag
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    setIsAuthed(Boolean(getAccessToken()));
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

        const mapped: ProjectItem[] = (res?.project ?? []).map((p) => {
          const tags = safeTechNames(p.techStacks);
          const position = mapPositionNeedsToDevPosition(p.positionNeeds);

          return {
            id: String(p.id),
            title: String(p.title),
            description: String(p.summary ?? ""),
            position,
            tags,
            currentCount: Number(p.membersCount ?? 0),
            totalCount: Number(p.membersCountMax ?? 0),
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

      setLoadingSide(true);
      try {
        const [rec, wish]: [ProjectRecommendResponse, ProjectWishlistResponse] =
          await Promise.all([apiGetProjectsRecommend(), apiGetProjectsWishlist()]);

        if (!mounted) return;

        const recTags = safeTechNames(rec?.techStacks);
        const wishTags = safeTechNames(wish?.techStacks);

        setRecommended(
          (rec?.project ?? []).map((p) => ({
            id: String(p.id),
            title: String(p.title),
            membersText: "", // 응답에 인원 정보가 없어서 비워둠(스펙 추가되면 채우기)
            tags: recTags,
          }))
        );

        setBookmarked(
          (wish?.project ?? []).map((p) => ({
            id: String(p.id),
            title: String(p.title),
            membersText: "",
            tags: wishTags,
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

      // 현재 API 스펙상 tags는 techStacks 기반이라 tools 필터는 당장은 의미가 약함
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-8 py-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tr("프로젝트", "プロジェクト")}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {tr(
                "원하는 스택과 역할로 참여할 프로젝트를 찾아보세요.",
                "希望のスタックと役割で参加するプロジェクトを探しましょう。"
              )}
            </p>
          </div>

          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            {tr("프로젝트 생성", "プロジェクト作成")}
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[190px_minmax(0,1fr)_270px]">
          <div className="min-w-0">
            <ProjectFilters value={filters} onChange={setFilters} />
          </div>

          <div className="min-w-0">
            {loadingList ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                {tr("불러오는 중...", "読み込み中...")}
              </div>
            ) : listError ? (
              <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">
                {tr("목록을 불러오지 못했습니다.", "一覧の取得に失敗しました。")}
                <div className="mt-2 text-xs text-red-600 break-words">{listError}</div>
              </div>
            ) : (
              <>
                <ProjectList projects={pagedProjects} />

                {filteredAll.length > 0 ? (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <p className="text-xs text-gray-500 text-center">
                      {tr("총", "合計")}{" "}
                      <span className="font-semibold text-gray-700">{filteredAll.length}</span>
                      {tr("개", "件")} · {tr("페이지", "ページ")}{" "}
                      <span className="font-semibold text-gray-700">{currentPage}</span> /{" "}
                      <span className="font-semibold text-gray-700">{totalPages}</span>
                    </p>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
                        disabled={currentPage === 1}
                        className={[
                          "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                          currentPage === 1
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
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
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
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
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {tr("다음", "次へ")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                    {tr("조건에 맞는 프로젝트가 없습니다.", "条件に合うプロジェクトがありません。")}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="min-w-0">
            {isAuthed ? (
              loadingSide ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                  {tr("사이드바 불러오는 중...", "サイドバー読み込み中...")}
                </div>
              ) : (
                <ProjectSidebar recommended={recommended} bookmarked={bookmarked} />
              )
            ) : (
              <GuestSidebar />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
