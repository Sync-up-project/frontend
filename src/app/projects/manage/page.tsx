"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchCurrentUser, getAccessToken, getCurrentUser } from "@/lib/auth";
import {
  apiGetProjectPendingApplications,
  apiGetProjectRecommendUsers,
  apiGetProjectsList,
  apiPatchApplication,
  apiPostProjectInvitation,
  pickArray,
} from "@/lib/api";

type ManagedProject = {
  id: string;
  ownerId: string;
  title: string;
  summary: string;
  status: string;
  mode: string;
  difficulty: string;
  description: string;
  deadline: string | null;
  endDate: string | null;
  techStacks: string[];
  positionNeeds: { position: string; headcount: number }[];
  createdAt: string | null;
  updatedAt: string | null;
  membersCount: number;
  capacity: number;
};

type RecommendedUser = {
  id: string;
  nickname: string;
  role: string | null;
  techStacks: string[];
  githubCommits: number;
  githubRepoCount: number;
  matchingPoint: number;
  reasons: string[];
};

type PendingApplicationRow = {
  id: string;
  applicantId: string;
  createdAt: string;
  applicant: {
    id: string;
    nickname: string | null;
    role: string | null;
    profileImageUrl: string | null;
  };
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function statusTone(status: string) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("RECRUIT") || s.includes("OPEN")) return "bg-emerald-100 text-emerald-700";
  if (s.includes("PROGRESS")) return "bg-indigo-100 text-indigo-700";
  if (s.includes("COMPLETE") || s.includes("DONE")) return "bg-gray-200 text-gray-700";
  if (s.includes("CANCEL") || s.includes("CLOSED")) return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toCsv(items: string[]) {
  return items.join(", ");
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function positionNeedsToInput(items: { position: string; headcount: number }[]) {
  return items.map((it) => `${it.position}:${it.headcount}`).join(", ");
}

function parsePositionNeedsInput(value: string) {
  return value
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((token) => {
      const [positionRaw, countRaw] = token.split(":").map((v) => v.trim());
      const position = (positionRaw || "").toUpperCase();
      const headcount = Number(countRaw || "1");
      if (!position) return null;
      return {
        position,
        headcount: Number.isFinite(headcount) && headcount > 0 ? headcount : 1,
      };
    })
    .filter((v): v is { position: string; headcount: number } => Boolean(v));
}

export default function ProjectManagePage() {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ManagedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedProject | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCapacity, setFormCapacity] = useState("1");
  const [formDeadline, setFormDeadline] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formMode, setFormMode] = useState("ONLINE");
  const [formDifficulty, setFormDifficulty] = useState("MEDIUM");
  const [formStatus, setFormStatus] = useState("PLANNING");
  const [formTechStacks, setFormTechStacks] = useState("");
  const [formPositionNeeds, setFormPositionNeeds] = useState("");
  const [recommendByProject, setRecommendByProject] = useState<
    Record<
      string,
      {
        loading: boolean;
        error: string | null;
        items: RecommendedUser[];
      }
    >
  >({});
  const [invitingKey, setInvitingKey] = useState<string | null>(null);
  const [applicationsByProject, setApplicationsByProject] = useState<
    Record<
      string,
      {
        loading: boolean;
        error: string | null;
        items: PendingApplicationRow[];
      }
    >
  >({});
  const [applicationActionKey, setApplicationActionKey] = useState<string | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const cached = getCurrentUser();
        const fallbackId = cached?.id ?? null;

        let currentUserId = fallbackId;
        try {
          const fresh = await fetchCurrentUser();
          currentUserId = fresh?.id ?? currentUserId;
        } catch {
          // 토큰 만료 등으로 /auth/me 실패할 수 있어 캐시를 fallback으로 사용
        }

        if (!mounted) return;
        setMyUserId(currentUserId);

        const listRes = await apiGetProjectsList();
        const raw = pickArray<any>(listRes);

        const mapped: ManagedProject[] = raw.map((p) => ({
          id: String(p?.id ?? ""),
          ownerId: String(
            p?.ownerId ?? p?.ownerid ?? p?.owner?.id ?? ""
          ),
          title: String(p?.titleOriginal ?? p?.title ?? "제목 없음"),
          summary: String(p?.summaryOriginal ?? p?.summary ?? "-"),
          description: String(p?.descriptionOriginal ?? p?.description ?? ""),
          status: String(p?.status ?? "UNKNOWN"),
          mode: String(p?.mode ?? "-"),
          difficulty: String(p?.difficulty ?? "-"),
          deadline: p?.deadline ? String(p.deadline) : null,
          endDate: p?.endDate ? String(p.endDate) : null,
          techStacks: Array.isArray(p?.techStacks)
            ? p.techStacks
                .map((t: any) => String(t?.name ?? t).trim())
                .filter(Boolean)
            : [],
          positionNeeds: Array.isArray(p?.positionNeeds)
            ? p.positionNeeds
                .map((pn: any) => ({
                  position: String(pn?.position ?? "").toUpperCase(),
                  headcount: Number(pn?.headcount ?? 1) || 1,
                }))
                .filter((pn: any) => pn.position)
            : [],
          createdAt: p?.createdAt ? String(p.createdAt) : null,
          updatedAt: p?.updatedAt ? String(p.updatedAt) : null,
          membersCount: Number(p?.membersCount ?? p?.members_count ?? 0) || 0,
          capacity: Number(p?.capacity ?? p?.membersCountMax ?? 0) || 0,
        }));

        const owned = currentUserId
          ? mapped.filter((m) => m.ownerId && m.ownerId === currentUserId)
          : [];

        if (!mounted) return;
        setItems(owned);
      } catch (e) {
        if (!mounted) return;
        setItems([]);
        setErrorMsg(String(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadPendingApplications(projectId: string) {
    const token = getAccessToken();
    if (!token) return;

    setApplicationsByProject((prev) => ({
      ...prev,
      [projectId]: {
        loading: true,
        error: null,
        items: prev[projectId]?.items ?? [],
      },
    }));

    try {
      const json = await apiGetProjectPendingApplications(projectId);
      const raw = Array.isArray(json?.applications) ? json.applications : [];
      const items: PendingApplicationRow[] = raw.map((row: any) => ({
        id: String(row?.id ?? ""),
        applicantId: String(row?.applicantId ?? ""),
        createdAt: String(row?.createdAt ?? ""),
        applicant: {
          id: String(row?.applicant?.id ?? row?.applicantId ?? ""),
          nickname: row?.applicant?.nickname ?? null,
          role: row?.applicant?.role ?? null,
          profileImageUrl: row?.applicant?.profileImageUrl ?? null,
        },
      }));
      setApplicationsByProject((prev) => ({
        ...prev,
        [projectId]: { loading: false, error: null, items },
      }));
    } catch (e) {
      setApplicationsByProject((prev) => ({
        ...prev,
        [projectId]: {
          loading: false,
          error: String(e),
          items: [],
        },
      }));
    }
  }

  const ownedProjectIdsKey = useMemo(
    () =>
      [...items]
        .map((p) => p.id)
        .filter(Boolean)
        .sort()
        .join(","),
    [items]
  );

  useEffect(() => {
    if (!ownedProjectIdsKey) return;
    const token = getAccessToken();
    if (!token) return;
    for (const id of ownedProjectIdsKey.split(",")) {
      if (id) void loadPendingApplications(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedProjectIdsKey]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q)
    );
  }, [items, keyword]);

  async function onDelete(projectId: string) {
    const ok = window.confirm("정말 이 프로젝트를 삭제할까요? 삭제 후 복구할 수 없습니다.");
    if (!ok) return;

    setDeletingId(projectId);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const text = await res.text();
      if (!res.ok) {
        alert(`삭제 실패: ${res.status} ${res.statusText}\n${text}`);
        setDeletingId(null);
        return;
      }

      setItems((prev) => prev.filter((it) => it.id !== projectId));
    } catch (e) {
      alert(`삭제 실패: ${String(e)}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function onEarlyClose(projectId: string) {
    const ok = window.confirm("이 프로젝트의 모집을 지금 즉시 마감할까요?");
    if (!ok) return;

    setClosingId(projectId);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ deadline: new Date().toISOString() }),
      });
      const text = await res.text();
      if (!res.ok) {
        alert(`조기 마감 실패: ${res.status} ${res.statusText}\n${text}`);
        return;
      }

      const nowIso = new Date().toISOString();
      setItems((prev) =>
        prev.map((it) =>
          it.id === projectId ? { ...it, deadline: nowIso, updatedAt: nowIso } : it
        )
      );
    } catch (e) {
      alert(`조기 마감 실패: ${String(e)}`);
    } finally {
      setClosingId(null);
    }
  }

  function openEditModal(item: ManagedProject) {
    setEditing(item);
    setFormTitle(item.title);
    setFormSummary(item.summary);
    setFormDescription(item.description ?? "");
    setFormCapacity(String(item.capacity || 1));
    setFormDeadline(toInputDate(item.deadline));
    setFormEndDate(toInputDate(item.endDate));
    setFormMode(item.mode || "ONLINE");
    setFormDifficulty(item.difficulty || "MEDIUM");
    setFormStatus(item.status || "PLANNING");
    setFormTechStacks(toCsv(item.techStacks));
    setFormPositionNeeds(positionNeedsToInput(item.positionNeeds));
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditing(null);
    setEditSubmitting(false);
  }

  async function onSaveEdit() {
    if (!editing) return;
    if (!formTitle.trim()) {
      alert("프로젝트 제목은 필수예요.");
      return;
    }
    if (!formDeadline || !formEndDate) {
      alert("모집 마감일과 프로젝트 마감일을 모두 입력해 주세요.");
      return;
    }

    setEditSubmitting(true);
    try {
      const token = getAccessToken();
      const payload = {
        titleOriginal: formTitle.trim(),
        summaryOriginal: formSummary.trim(),
        descriptionOriginal: formDescription.trim(),
        capacity: Number(formCapacity) > 0 ? Number(formCapacity) : 1,
        deadline: new Date(formDeadline).toISOString(),
        endDate: new Date(formEndDate).toISOString(),
        mode: formMode,
        difficulty: formDifficulty,
        status: formStatus,
        techStacks: parseCsv(formTechStacks),
        positionNeeds: parsePositionNeedsInput(formPositionNeeds),
      };
      const res = await fetch(`/api/projects/${editing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        alert(`수정 실패: ${res.status} ${res.statusText}\n${text}`);
        setEditSubmitting(false);
        return;
      }

      const json = text ? JSON.parse(text) : null;
      const updated = json?.project ?? null;
      setItems((prev) =>
        prev.map((it) =>
          it.id === editing.id
            ? {
                ...it,
                title: updated?.titleOriginal ?? payload.titleOriginal,
                summary: updated?.summaryOriginal ?? payload.summaryOriginal,
                description:
                  updated?.descriptionOriginal ?? payload.descriptionOriginal,
                mode: updated?.mode ?? payload.mode,
                difficulty: updated?.difficulty ?? payload.difficulty,
                status: updated?.status ?? payload.status,
                capacity: updated?.capacity ?? payload.capacity,
                deadline: updated?.deadline ?? payload.deadline,
                endDate: updated?.endDate ?? payload.endDate,
                techStacks: Array.isArray(updated?.techStacks)
                  ? updated.techStacks
                      .map((t: any) => String(t?.techStack?.name ?? t?.name ?? t).trim())
                      .filter(Boolean)
                  : payload.techStacks,
                positionNeeds: Array.isArray(updated?.positionNeeds)
                  ? updated.positionNeeds.map((pn: any) => ({
                      position: String(pn?.position ?? "").toUpperCase(),
                      headcount: Number(pn?.headcount ?? 1) || 1,
                    }))
                  : payload.positionNeeds,
                updatedAt: updated?.updatedAt ?? new Date().toISOString(),
              }
            : it
        )
      );
      closeEditModal();
    } catch (e) {
      alert(`수정 실패: ${String(e)}`);
      setEditSubmitting(false);
    }
  }

  async function loadRecommendations(projectId: string) {
    setRecommendByProject((prev) => ({
      ...prev,
      [projectId]: {
        loading: true,
        error: null,
        items: prev[projectId]?.items ?? [],
      },
    }));

    try {
      const token = getAccessToken();
      if (!token) {
        setRecommendByProject((prev) => ({
          ...prev,
          [projectId]: {
            loading: false,
            error: "로그인이 필요합니다.",
            items: prev[projectId]?.items ?? [],
          },
        }));
        return;
      }
      const json = await apiGetProjectRecommendUsers(projectId, 15);
      const items = Array.isArray(json?.items) ? json.items : [];
      setRecommendByProject((prev) => ({
        ...prev,
        [projectId]: {
          loading: false,
          error: null,
          items,
        },
      }));
    } catch (e) {
      setRecommendByProject((prev) => ({
        ...prev,
        [projectId]: {
          loading: false,
          error: String(e),
          items: prev[projectId]?.items ?? [],
        },
      }));
    }
  }

  async function onRespondApplication(
    projectId: string,
    applicationId: string,
    decision: "ACCEPT" | "REJECT"
  ) {
    const token = getAccessToken();
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    const key = `${applicationId}:${decision}`;
    setApplicationActionKey(key);
    try {
      await apiPatchApplication(applicationId, { decision });
      await loadPendingApplications(projectId);
    } catch (e) {
      alert(`처리 실패: ${String(e)}`);
    } finally {
      setApplicationActionKey(null);
    }
  }

  async function onInviteMember(projectId: string, user: RecommendedUser) {
    const token = getAccessToken();
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    const key = `${projectId}:${user.id}`;
    setInvitingKey(key);
    try {
      await apiPostProjectInvitation(projectId, { inviteeId: user.id });
      alert(`${user.nickname}님에게 초대 알림을 보냈습니다.`);
      await loadRecommendations(projectId);
    } catch (e) {
      alert(`초대 실패: ${String(e)}`);
    } finally {
      setInvitingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
            <p className="mt-1 text-sm text-gray-600">
              내가 생성한 프로젝트를 한 곳에서 관리해요.{" "}
              <span className="text-gray-500">
                유저 추천을 불러온 뒤, 추천 카드의 <strong>초대</strong>로 멤버를 초대할 수 있어요.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/projects/new"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              프로젝트 생성
            </Link>
            <Link
              href="/projects"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              프로젝트 목록
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">내 프로젝트</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">현재 표시</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{filtered.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">로그인 사용자 ID</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-700">{myUserId ?? "-"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500">검색</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="프로젝트명 / 요약 / ID"
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-5 text-sm text-gray-600">불러오는 중...</div>
          ) : errorMsg ? (
            <pre className="p-5 text-xs text-red-700 whitespace-pre-wrap">{errorMsg}</pre>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">
              관리 가능한 프로젝트가 없어요. 프로젝트 생성 후 다시 확인해주세요.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">검색 조건에 맞는 프로젝트가 없어요.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((it) => (
                <li key={it.id} className="p-5">
                  {(() => {
                    const recState = recommendByProject[it.id] ?? {
                      loading: false,
                      error: null,
                      items: [] as RecommendedUser[],
                    };
                    return (
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold text-gray-900">{it.title}</h2>
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusTone(it.status)}`}>
                          {it.status}
                        </span>
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                          {it.mode}
                        </span>
                        <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          {it.difficulty}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{it.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {it.techStacks.slice(0, 4).map((stack) => (
                          <span
                            key={stack}
                            className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700"
                          >
                            {stack}
                          </span>
                        ))}
                        {it.positionNeeds.map((pn, idx) => (
                          <span
                            key={`${pn.position}-${idx}`}
                            className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700"
                          >
                            {pn.position}:{pn.headcount}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>ID: {it.id}</span>
                        <span>모집 마감: {formatDate(it.deadline)}</span>
                        <span>프로젝트 마감: {formatDate(it.endDate)}</span>
                        <span>생성: {formatDate(it.createdAt)}</span>
                        <span>수정: {formatDate(it.updatedAt)}</span>
                        <span>
                          인원: {it.membersCount}/{it.capacity || "-"}
                        </span>
                      </div>

                      {(() => {
                        const appState = applicationsByProject[it.id] ?? {
                          loading: false,
                          error: null,
                          items: [] as PendingApplicationRow[],
                        };
                        if (
                          !appState.loading &&
                          !appState.error &&
                          appState.items.length === 0
                        ) {
                          return null;
                        }
                        return (
                          <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-violet-900">
                                참가 신청 (대기)
                              </p>
                              <button
                                type="button"
                                onClick={() => loadPendingApplications(it.id)}
                                disabled={appState.loading}
                                className="rounded-md border border-violet-200 bg-white px-2 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
                              >
                                {appState.loading ? "불러오는 중..." : "새로고침"}
                              </button>
                            </div>
                            {appState.error ? (
                              <p className="mt-2 text-xs text-rose-700">{appState.error}</p>
                            ) : appState.loading && appState.items.length === 0 ? (
                              <p className="mt-2 text-xs text-violet-800">불러오는 중...</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {appState.items.map((app) => (
                                  <li
                                    key={app.id}
                                    className="rounded-lg border border-violet-200 bg-white px-3 py-2"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <span className="text-sm font-semibold text-gray-900">
                                          {app.applicant.nickname ?? "이름 없음"}
                                        </span>
                                        {app.applicant.role && (
                                          <span className="ml-2 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                            {app.applicant.role}
                                          </span>
                                        )}
                                        <p className="mt-1 text-[11px] text-gray-500">
                                          신청일: {formatDate(app.createdAt)}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[10px] text-gray-400">
                                          {app.applicantId}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 flex-wrap gap-1">
                                        <button
                                          type="button"
                                          disabled={
                                            applicationActionKey?.startsWith(`${app.id}:`) ??
                                            false
                                          }
                                          onClick={() =>
                                            onRespondApplication(it.id, app.id, "ACCEPT")
                                          }
                                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                          수락
                                        </button>
                                        <button
                                          type="button"
                                          disabled={
                                            applicationActionKey?.startsWith(`${app.id}:`) ??
                                            false
                                          }
                                          onClick={() =>
                                            onRespondApplication(it.id, app.id, "REJECT")
                                          }
                                          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                          거절
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })()}

                      {(recState.items.length > 0 || recState.error) && (
                        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <p className="text-xs font-semibold text-gray-600">추천 유저</p>
                          {recState.error ? (
                            <p className="mt-2 text-xs text-rose-700">{recState.error}</p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {recState.items.map((u) => (
                                <li
                                  key={u.id}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900">
                                          {u.nickname}
                                        </span>
                                        {u.role && (
                                          <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                            {u.role}
                                          </span>
                                        )}
                                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                          매칭 {u.matchingPoint}점
                                        </span>
                                      </div>
                                      <p className="mt-1 text-[11px] text-gray-600">
                                        {u.reasons?.join(" · ") || "추천 사유 없음"}
                                      </p>
                                      <p className="mt-1 text-[11px] text-gray-500">
                                        스택: {(u.techStacks ?? []).join(", ") || "-"} / 커밋:{" "}
                                        {u.githubCommits ?? 0} / 리포: {u.githubRepoCount ?? 0}
                                      </p>
                                      <p className="mt-1 font-mono text-[10px] text-gray-400">{u.id}</p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={invitingKey === `${it.id}:${u.id}`}
                                      onClick={() => onInviteMember(it.id, u)}
                                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                      {invitingKey === `${it.id}:${u.id}` ? "전송 중..." : "초대"}
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadRecommendations(it.id)}
                        disabled={recState.loading}
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        {recState.loading ? "추천 계산 중..." : "유저 추천"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEarlyClose(it.id)}
                        disabled={closingId === it.id}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                      >
                        {closingId === it.id ? "마감 중..." : "모집 조기 마감"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(it)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        수정
                      </button>
                      <Link
                        href={`/projects/${it.id}`}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        상세
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(it.id)}
                        disabled={deletingId === it.id}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {deletingId === it.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </div>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editOpen && editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">프로젝트 수정</h3>
                <p className="mt-1 text-xs text-gray-500">
                  ID: <code>{editing.id}</code>
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">프로젝트명</span>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">요약</span>
                <input
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">설명</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={6}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">진행 방식</span>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">난이도</span>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">상태</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="PLANNING">PLANNING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELED">CANCELED</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">기술 스택 (쉼표 구분)</span>
                <input
                  value={formTechStacks}
                  onChange={(e) => setFormTechStacks(e.target.value)}
                  placeholder="예: React, Next.js, TypeScript, Prisma"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold">모집 포지션 (POSITION:인원, 쉼표 구분)</span>
                <input
                  value={formPositionNeeds}
                  onChange={(e) => setFormPositionNeeds(e.target.value)}
                  placeholder="예: DEV:2, DESIGN:1, PLANNER:1"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">모집 인원</span>
                  <input
                    type="number"
                    min={1}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">모집 마감일</span>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">프로젝트 마감일</span>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeEditModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={onSaveEdit}
                disabled={editSubmitting}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {editSubmitting ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
