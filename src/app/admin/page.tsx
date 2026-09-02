"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AdminAuditLog,
  AdminCommunityPost,
  AdminNotice,
  AdminProject,
  AdminUser,
  getAdminAuditLogs,
  getAdminCommunityPosts,
  getAdminNotices,
  getAdminOverview,
  getAdminProjects,
  getAdminUsers,
  type AdminOverview,
} from "@/lib/adminApi";
import { fetchCurrentUser, getAccessToken, getCurrentUser } from "@/lib/auth";

type TabKey = "users" | "projects" | "community" | "notices" | "audit";

const TABS: { key: TabKey; label: string }[] = [
  { key: "users", label: "회원" },
  { key: "projects", label: "프로젝트" },
  { key: "community", label: "커뮤니티" },
  { key: "notices", label: "공지사항" },
  { key: "audit", label: "감사로그" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function displayUser(user?: { email?: string | null; nickname?: string | null } | null) {
  if (!user) return "-";
  return user.nickname || user.email || "-";
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-gray-950">{value.toLocaleString("ko-KR")}</p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "ADMIN" || value === "PENDING" || value === "IN_PROGRESS"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : value === "COMPLETED" || value === "USER"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${tone}`}>
      {value}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabKey>("users");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [communityPosts, setCommunityPosts] = useState<AdminCommunityPost[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        if (!getAccessToken()) {
          router.replace("/admin/login");
          return;
        }

        const cached = getCurrentUser();
        const user = cached?.accountRole ? cached : await fetchCurrentUser();
        if (!mounted) return;

        if (user.accountRole !== "ADMIN") {
          router.replace("/admin/login");
          return;
        }

        setReady(true);
      } catch {
        if (!mounted) return;
        router.replace("/admin/login");
      }
    }

    checkAdmin();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [
          overviewRes,
          usersRes,
          projectsRes,
          communityRes,
          noticesRes,
          auditRes,
        ] = await Promise.all([
          getAdminOverview(),
          getAdminUsers({ q: query }),
          getAdminProjects({ q: query }),
          getAdminCommunityPosts({ q: query }),
          getAdminNotices({ q: query }),
          getAdminAuditLogs(),
        ]);

        if (!mounted) return;
        setOverview(overviewRes);
        setUsers(usersRes.items);
        setProjects(projectsRes.items);
        setCommunityPosts(communityRes.items);
        setNotices(noticesRes.items);
        setAuditLogs(auditRes.items);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "어드민 데이터를 불러오지 못했습니다.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [ready, query]);

  const rows = useMemo(() => {
    switch (tab) {
      case "users":
        return users;
      case "projects":
        return projects;
      case "community":
        return communityPosts;
      case "notices":
        return notices;
      case "audit":
        return auditLogs;
      default:
        return [];
    }
  }, [auditLogs, communityPosts, notices, projects, tab, users]);

  if (!ready) {
    return <main className="min-h-screen bg-gray-50 px-6 py-10 text-sm text-gray-500">확인 중...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">SyncUp Admin</p>
            <h1 className="mt-1 text-2xl font-extrabold">운영 콘솔</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/projects")}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            서비스로 이동
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-6 py-6">
        {overview ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Stat label="회원" value={overview.totalUsers} />
            <Stat label="관리자" value={overview.adminUsers} />
            <Stat label="프로젝트" value={overview.totalProjects} />
            <Stat label="활성 프로젝트" value={overview.activeProjects} />
            <Stat label="게시글" value={overview.communityPosts} />
            <Stat label="공지" value={overview.notices} />
          </div>
        ) : null}

        <div className="mt-6 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`rounded-md px-3 py-2 text-sm font-bold ${
                      tab === item.key
                        ? "bg-gray-950 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab !== "audit" ? (
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:w-80"
                  placeholder="이름, 이메일, 제목 검색"
                />
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">불러오는 중...</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              <>
                {tab === "users" ? <UsersTable rows={users} /> : null}
                {tab === "projects" ? <ProjectsTable rows={projects} /> : null}
                {tab === "community" ? <CommunityTable rows={communityPosts} /> : null}
                {tab === "notices" ? <NoticesTable rows={notices} /> : null}
                {tab === "audit" ? <AuditTable rows={auditLogs} /> : null}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function UsersTable({ rows }: { rows: AdminUser[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">회원</th>
          <th className="px-4 py-3">권한</th>
          <th className="px-4 py-3">포지션</th>
          <th className="px-4 py-3">활동</th>
          <th className="px-4 py-3">가입일</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              <div className="font-bold text-gray-950">{row.nickname || "-"}</div>
              <div className="mt-1 text-xs text-gray-500">{row.email || row.githubUsername || row.id}</div>
            </td>
            <td className="px-4 py-3"><StatusBadge value={row.accountRole} /></td>
            <td className="px-4 py-3 text-gray-700">{row.role || "-"}</td>
            <td className="px-4 py-3 text-gray-700">
              프로젝트 {row._count.ownedProjects + row._count.memberships} / 글 {row._count.communityPosts}
            </td>
            <td className="px-4 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProjectsTable({ rows }: { rows: AdminProject[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">프로젝트 그룹</th>
          <th className="px-4 py-3">상태</th>
          <th className="px-4 py-3">오너</th>
          <th className="px-4 py-3">멤버/정원</th>
          <th className="px-4 py-3">신청/초대</th>
          <th className="px-4 py-3">생성일</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              <div className="font-bold text-gray-950">{row.titleOriginal}</div>
              <div className="mt-1 max-w-xl truncate text-xs text-gray-500">{row.summaryOriginal}</div>
            </td>
            <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
            <td className="px-4 py-3 text-gray-700">{displayUser(row.owner)}</td>
            <td className="px-4 py-3 text-gray-700">{row._count.members} / {row.capacity}</td>
            <td className="px-4 py-3 text-gray-700">
              {row._count.applications} / {row._count.invitations}
            </td>
            <td className="px-4 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CommunityTable({ rows }: { rows: AdminCommunityPost[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">게시글</th>
          <th className="px-4 py-3">작성자</th>
          <th className="px-4 py-3">반응</th>
          <th className="px-4 py-3">작성일</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              <div className="font-bold text-gray-950">{row.titleOriginal}</div>
              <div className="mt-1 text-xs text-gray-500">{row.category}</div>
            </td>
            <td className="px-4 py-3 text-gray-700">{displayUser(row.author)}</td>
            <td className="px-4 py-3 text-gray-700">
              조회 {row.viewCount} / 댓글 {row.commentCount} / 좋아요 {row.likeCount}
            </td>
            <td className="px-4 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NoticesTable({ rows }: { rows: AdminNotice[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">공지</th>
          <th className="px-4 py-3">작성자</th>
          <th className="px-4 py-3">조회</th>
          <th className="px-4 py-3">작성일</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              <div className="font-bold text-gray-950">{row.titleOriginal}</div>
              {row.pinned ? <div className="mt-1 text-xs font-bold text-blue-700">고정됨</div> : null}
            </td>
            <td className="px-4 py-3 text-gray-700">{displayUser(row.author)}</td>
            <td className="px-4 py-3 text-gray-700">{row.viewCount}</td>
            <td className="px-4 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AuditTable({ rows }: { rows: AdminAuditLog[] }) {
  return (
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50 text-left text-xs font-bold uppercase text-gray-500">
        <tr>
          <th className="px-4 py-3">작업</th>
          <th className="px-4 py-3">대상</th>
          <th className="px-4 py-3">관리자</th>
          <th className="px-4 py-3">시간</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-3">
              <div className="font-bold text-gray-950">{row.summary || row.action}</div>
              <div className="mt-1 text-xs text-gray-500">{row.action}</div>
            </td>
            <td className="px-4 py-3 text-gray-700">{row.entityType}</td>
            <td className="px-4 py-3 text-gray-700">{displayUser(row.actor)}</td>
            <td className="px-4 py-3 text-gray-600">{formatDate(row.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
