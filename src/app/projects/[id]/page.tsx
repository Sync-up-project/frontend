"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DraftViewer from "@/components/draft/DraftViewer";
import KanbanBoardDndView from "@/components/kanban/KanbanBoardDndView";
import ProjectSchedule from "@/components/schedule/ProjectSchedule";
import { fetchCurrentUser, getAccessToken, getCurrentUser } from "@/lib/auth";
import {
  apiApproveProjectMemberRemovalRequest,
  apiGetProjectMembers,
  apiGetProjectMeParticipation,
  apiPatchInvitation,
  apiPostProjectMemberRemovalRequest,
  apiPostProjectApplication,
  type ProjectMemberListResponse,
  type ProjectMemberRemovalRequest,
} from "@/lib/api";

type Project = {
  id: string;
  ownerId: string;
  ownerid?: string;
  owner?: { id?: string };
  originalLang: string;
  titleOriginal: string;
  summaryOriginal: string;
  descriptionOriginal: string;
  mode: string;
  difficulty: string;
  status: string;
  deadline?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    id: string;
    userId: string;
    roleInProject?: string | null;
    joinedAt?: string;
    user?: {
      id: string;
      nickname?: string | null;
      profileImageUrl?: string | null;
      role?: string | null;
    };
  }>;
};

type LatestArtifact = {
  meta: {
    id: string;
    type: string;
    version: number;
    projectId: string | null;
    createdById: string | null;
    promptHash: string | null;
    createdAt: string;
    updatedAt: string;
  };
  contentJson: any;
};

type DecisionMeta = {
  label: string;
  section: "인증" | "레포" | "프로젝트" | "기타";
  order: number;
  format?: (v: any) => string;
};

const DECISION_META: Record<string, DecisionMeta> = {
  Q1: {
    label: "로그인 방식",
    section: "인증",
    order: 1,
    format: (v) =>
      v === "GitHub only"
        ? "GitHub OAuth만"
        : v === "GitHub + Email"
        ? "GitHub OAuth + Email"
        : String(v),
  },
  Q2: {
    label: "프로젝트당 레포",
    section: "레포",
    order: 2,
    format: (v) =>
      v === "1개"
        ? "1개(단일 레포)"
        : v === "여러 개"
        ? "여러 개(멀티 레포)"
        : String(v),
  },
};

function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "indigo" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-gray-900">
          {title}
        </h3>
        {right}
      </div>
      <div className="mt-3 text-sm text-gray-700">{children}</div>
    </section>
  );
}

function safeArr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

type KanbanCardLike = {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status?: string;
  position?: number;
};

type KanbanColumnLike = {
  id: string;
  title: string;
  position?: number;
  cards?: KanbanCardLike[];
};

type KanbanBoardLike = {
  id: string;
  projectId?: string;
  columns: KanbanColumnLike[];
};

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id;
  const router = useRouter();

  const [data, setData] = useState<{
    project: Project;
    latestArtifact: LatestArtifact | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [tab, setTab] = useState<
    "overview" | "schedule" | "board" | "artifact" | "raw"
  >(
    "overview"
  );

  const [board, setBoard] = useState<KanbanBoardLike | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(true);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  const [revisionText, setRevisionText] = useState("");
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  // ✅ 프로젝트 삭제 상태
  const [projectDeleting, setProjectDeleting] = useState(false);

  const [participation, setParticipation] = useState<{
    isOwner: boolean;
    isMember: boolean;
    pendingInvitation: {
      id: string;
      inviterId: string;
      message: string | null;
      createdAt: string;
    } | null;
    pendingApplication: { id: string; createdAt: string } | null;
  } | null>(null);
  const [participationLoading, setParticipationLoading] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [participationBusy, setParticipationBusy] = useState(false);
  const [membersData, setMembersData] = useState<ProjectMemberListResponse | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberRemovalBusyKey, setMemberRemovalBusyKey] = useState<string | null>(null);

  // ---- Add Card Modal state ----
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTargetColumn, setAddTargetColumn] = useState<{
    columnId: string;
    columnTitle: string;
  } | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardDue, setNewCardDue] = useState(""); // yyyy-mm-dd
  const [newCardSubmitting, setNewCardSubmitting] = useState(false);

  // ---- Edit Card Modal state ----
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    cardId: string;
    columnTitle: string;
    currentTitle: string;
    currentDesc: string;
    currentDue: string; // yyyy-mm-dd
  } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ---- Delete confirm modal state ----
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    cardId: string;
    cardTitle: string;
    columnTitle: string;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // ---- fetchers ----
  const fetchProjectDetail = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        cache: "no-store",
      });
      const text = await res.text();

      if (!res.ok) {
        setErrorMsg(`불러오기 실패: ${res.status} ${res.statusText}\n${text}`);
        setData(null);
        setLoading(false);
        return;
      }

      if (!text) {
        setErrorMsg("Empty response");
        setData(null);
        setLoading(false);
        return;
      }

      const json = JSON.parse(text);
      // 백엔드 응답이 { project, latestArtifact } 또는 plain project 둘 다 들어올 수 있어 정규화합니다.
      if (json?.project) {
        setData({
          project: json.project,
          latestArtifact: json.latestArtifact ?? null,
        });
      } else {
        setData({
          project: json,
          latestArtifact: null,
        });
      }
      setLoading(false);
    } catch (e) {
      setErrorMsg(String(e));
      setData(null);
      setLoading(false);
    }
  };

  const fetchArtifacts = async () => {
    setArtifactsLoading(true);
    setArtifactsError(null);
    try {
      const res = await fetch(`/api/ai/artifacts?projectId=${projectId}`, {
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) {
        setArtifactsError(
          `불러오기 실패: ${res.status} ${res.statusText}\n${text}`
        );
        setArtifacts([]);
        setArtifactsLoading(false);
        return;
      }
      const json = text ? JSON.parse(text) : null;
      setArtifacts(json?.items ?? []);
      setArtifactsLoading(false);
    } catch (e) {
      setArtifactsError(String(e));
      setArtifacts([]);
      setArtifactsLoading(false);
    }
  };

  const fetchBoard = async () => {
    setBoardLoading(true);
    setBoardError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/kanban`, {
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) {
        setBoard(null);
        setBoardError(
          `칸반 불러오기 실패: ${res.status} ${res.statusText}\n${text}`
        );
        setBoardLoading(false);
        return;
      }
      setBoard(text ? JSON.parse(text) : null);
      setBoardLoading(false);
    } catch (e) {
      setBoard(null);
      setBoardError(`칸반 불러오기 실패: ${String(e)}`);
      setBoardLoading(false);
    }
  };

  // ✅ 프로젝트 삭제 (Next /api 프록시 호출 방식 유지)
  const deleteProject = async () => {
    if (!isOwner) {
      alert("프로젝트 소유자만 삭제할 수 있어요.");
      return;
    }
    const ok = window.confirm(
      "정말 이 프로젝트를 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다."
    );
    if (!ok) return;

    setProjectDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const text = await res.text();

      if (!res.ok) {
        alert(`프로젝트 삭제 실패: ${res.status} ${res.statusText}\n${text}`);
        setProjectDeleting(false);
        return;
      }

      alert("프로젝트가 삭제되었습니다.");
      router.push("/projects");
      router.refresh();
    } catch (e) {
      alert(`프로젝트 삭제 실패: ${String(e)}`);
    } finally {
      setProjectDeleting(false);
    }
  };

  const project = data?.project;
  const latestArtifact = data?.latestArtifact ?? null;
  const projectOwnerId =
    project?.ownerId ?? project?.ownerid ?? project?.owner?.id ?? null;
  const isOwner = Boolean(
    projectOwnerId && currentUserId && String(projectOwnerId) === String(currentUserId)
  );
  const isMember = Boolean(participation?.isMember);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = getCurrentUser();
      if (mounted) setCurrentUserId(cached?.id ?? null);
      try {
        const fresh = await fetchCurrentUser();
        if (mounted) setCurrentUserId(fresh?.id ?? cached?.id ?? null);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetchProjectDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!isOwner) {
      setArtifacts([]);
      setArtifactsLoading(false);
      setArtifactsError(null);
      return;
    }
    fetchArtifacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isOwner]);

  useEffect(() => {
    fetchBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (isOwner) return;
    if (isMember) {
      if (tab === "raw" || tab === "board") setTab("overview");
      return;
    }
    if (tab === "artifact" || tab === "raw" || tab === "schedule") setTab("overview");
  }, [isOwner, isMember, tab]);

  const reloadParticipation = useCallback(async () => {
    if (!currentUserId || !projectId) {
      setParticipation(null);
      return;
    }
    setParticipationLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setParticipation(null);
        return;
      }
      const json = await apiGetProjectMeParticipation(projectId);
      setParticipation(json ?? null);
    } catch {
      setParticipation(null);
    } finally {
      setParticipationLoading(false);
    }
  }, [projectId, currentUserId]);

  useEffect(() => {
    reloadParticipation();
  }, [reloadParticipation]);

  const decisionsContainer = (latestArtifact as any)?.contentJson?.decisions;
  const decisions = decisionsContainer?.answers ?? null;
  const decisionsAnsweredAt = decisionsContainer?.answeredAt ?? null;
  const decisionsSchemaVersion = decisionsContainer?.schema_version ?? null;
  const policy = (data as any)?.policy ?? null;

  const latestArtifactId = latestArtifact?.meta?.id ?? null;
  const ownerTabs = useMemo(
    () => ["overview", "schedule", "board", "artifact", "raw"] as const,
    []
  );

  const idea = latestArtifact?.contentJson?.ideaNormalized;
  const ideaTitle =
    idea?.project_meta?.title ?? project?.titleOriginal ?? "Untitled";
  const oneLiner =
    idea?.project_meta?.one_liner ?? project?.summaryOriginal ?? "-";
  const featuresCount = safeArr(idea?.features).length;

  const headerBadges = useMemo(() => {
    if (!project) return null;
    return (
      <div className="flex flex-wrap gap-2">
        <Badge tone="indigo">{project.status}</Badge>
        <Badge tone="gray">{project.mode}</Badge>
        <Badge tone="amber">{project.difficulty}</Badge>
        <Badge tone="gray">{project.originalLang}</Badge>
      </div>
    );
  }, [project]);

  // ---- Add card modal helpers ----
  const openAddCardModal = (columnId: string, columnTitle: string) => {
    setAddTargetColumn({ columnId, columnTitle });
    setNewCardTitle("");
    setNewCardDesc("");
    setNewCardDue("");
    setAddModalOpen(true);
  };

  const closeAddCardModal = () => {
    setAddModalOpen(false);
    setAddTargetColumn(null);
    setNewCardTitle("");
    setNewCardDesc("");
    setNewCardDue("");
  };

  const submitNewCard = async () => {
    if (!addTargetColumn?.columnId) return;
    if (!newCardTitle.trim()) return;

    setNewCardSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/kanban/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId: addTargetColumn.columnId,
          title: newCardTitle.trim(),
          description: newCardDesc.trim() || null,
          dueDate: newCardDue ? new Date(newCardDue).toISOString() : null,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        alert(`카드 생성 실패: ${res.status} ${res.statusText}\n${text}`);
        setNewCardSubmitting(false);
        return;
      }

      await fetchBoard();
      closeAddCardModal();
    } catch (e) {
      alert(`카드 생성 실패: ${String(e)}`);
    } finally {
      setNewCardSubmitting(false);
    }
  };

  // ---- Edit card modal helpers ----
  const toYyyyMmDd = (dateLike?: string | null) => {
    if (!dateLike) return "";
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const openEditCardModal = (card: KanbanCardLike, columnTitle: string) => {
    const currentTitle = card.title ?? "";
    const currentDesc = (card.description ?? "") as string;
    const currentDue = toYyyyMmDd(card.dueDate ?? null);

    setEditTarget({
      cardId: card.id,
      columnTitle,
      currentTitle,
      currentDesc,
      currentDue,
    });
    setEditTitle(currentTitle);
    setEditDesc(currentDesc);
    setEditDue(currentDue);
    setEditModalOpen(true);
  };

  const closeEditCardModal = () => {
    setEditModalOpen(false);
    setEditTarget(null);
    setEditTitle("");
    setEditDesc("");
    setEditDue("");
  };

  const submitEditCard = async () => {
    if (!editTarget?.cardId) return;
    if (!editTitle.trim()) return;

    setEditSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/kanban/cards/${editTarget.cardId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle.trim(),
            description: editDesc.trim() || null,
            dueDate: editDue ? new Date(editDue).toISOString() : null,
          }),
        }
      );

      const text = await res.text();
      if (!res.ok) {
        alert(`카드 수정 실패: ${res.status} ${res.statusText}\n${text}`);
        setEditSubmitting(false);
        return;
      }

      await fetchBoard();
      closeEditCardModal();
    } catch (e) {
      alert(`카드 수정 실패: ${String(e)}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---- Delete helpers ----
  const openDeleteModal = (
    cardId: string,
    cardTitle: string,
    columnTitle: string
  ) => {
    setDeleteTarget({ cardId, cardTitle, columnTitle });
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const fetchMembers = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setMembersData(null);
      setMembersError(null);
      return;
    }

    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await apiGetProjectMembers(projectId);
      setMembersData(res);
    } catch (e) {
      setMembersError(String(e));
    } finally {
      setMembersLoading(false);
    }
  }, [projectId]);

  const requestMemberRemoval = async (targetUserId: string) => {
    const key = `request:${targetUserId}`;
    setMemberRemovalBusyKey(key);
    try {
      await apiPostProjectMemberRemovalRequest(projectId, { targetUserId });
      await fetchMembers();
      alert("퇴장 요청을 보냈습니다. 상대방이 동의하면 퇴장 처리됩니다.");
    } catch (e) {
      alert(`퇴장 요청 실패: ${String(e)}`);
    } finally {
      setMemberRemovalBusyKey(null);
    }
  };

  const approveMemberRemoval = async (requestId: string) => {
    const key = `approve:${requestId}`;
    setMemberRemovalBusyKey(key);
    try {
      const res = await apiApproveProjectMemberRemovalRequest(projectId, requestId);
      await fetchMembers();
      await reloadParticipation();
      await fetchProjectDetail();
      alert(
        res?.status === "COMPLETED"
          ? "양쪽 동의가 완료되어 멤버가 퇴장 처리되었습니다."
          : "퇴장 요청에 동의했습니다.",
      );
    } catch (e) {
      alert(`퇴장 동의 실패: ${String(e)}`);
    } finally {
      setMemberRemovalBusyKey(null);
    }
  };

  useEffect(() => {
    if (currentUserId && (isOwner || isMember)) {
      fetchMembers();
      return;
    }
    setMembersData(null);
    setMembersError(null);
  }, [currentUserId, isOwner, isMember, fetchMembers]);

  const submitDelete = async () => {
    if (!deleteTarget?.cardId) return;

    setDeleteSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/kanban/cards/${deleteTarget.cardId}`,
        { method: "DELETE" }
      );
      const text = await res.text();
      if (!res.ok) {
        alert(`카드 삭제 실패: ${res.status} ${res.statusText}\n${text}`);
        setDeleteSubmitting(false);
        return;
      }

      await fetchBoard();
      closeDeleteModal();
    } catch (e) {
      alert(`카드 삭제 실패: ${String(e)}`);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent">
      <div className="mx-auto max-w-screen-2xl px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {project?.titleOriginal ?? "프로젝트"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            프로젝트 ID: <code>{projectId}</code>
          </p>
          <div className="mt-2">{headerBadges}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/projects"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            프로젝트 목록
          </Link>

          {isOwner && (
            <Link
              href="/projects/manage"
              title="추천 멤버에서 초대할 수 있어요"
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
            >
              멤버 초대
            </Link>
          )}

          {!isOwner && currentUserId && participation && !participation.isMember && participation.pendingInvitation && (
            <>
              <button
                type="button"
                disabled={participationBusy}
                onClick={async () => {
                  const token = getAccessToken();
                  if (!token || !participation.pendingInvitation) return;
                  setParticipationBusy(true);
                  try {
                    await apiPatchInvitation(participation.pendingInvitation.id, {
                      decision: "ACCEPT",
                    });
                    await reloadParticipation();
                    await fetchProjectDetail();
                  } catch (e) {
                    alert(String(e));
                  } finally {
                    setParticipationBusy(false);
                  }
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                초대 수락
              </button>
              <button
                type="button"
                disabled={participationBusy}
                onClick={async () => {
                  const token = getAccessToken();
                  if (!token || !participation.pendingInvitation) return;
                  setParticipationBusy(true);
                  try {
                    await apiPatchInvitation(participation.pendingInvitation.id, {
                      decision: "REJECT",
                    });
                    await reloadParticipation();
                  } catch (e) {
                    alert(String(e));
                  } finally {
                    setParticipationBusy(false);
                  }
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                초대 거절
              </button>
            </>
          )}

          {!isOwner &&
            currentUserId &&
            participation &&
            !participation.isMember &&
            !participation.pendingInvitation &&
            !participation.pendingApplication && (
              <button
                type="button"
                onClick={() => setJoinModalOpen(true)}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                참가 신청
              </button>
            )}

          {!isOwner && currentUserId && participation?.pendingApplication && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              참가 신청 검토 중
            </span>
          )}

          {!isOwner && currentUserId && participation?.isMember && (
            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              멤버
            </span>
          )}

          {!currentUserId && (
            <Link
              href="/login"
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              로그인 후 참가
            </Link>
          )}

          {isOwner ? (
            <>
              <button
                onClick={deleteProject}
                disabled={projectDeleting}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                title="프로젝트 삭제"
              >
                {projectDeleting ? "삭제 중..." : "프로젝트 삭제"}
              </button>

              <Link
                href="/drafts"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                드래프트
              </Link>
            </>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {!loading && errorMsg && (
        <pre className="mt-4 rounded-2xl border border-red-200 bg-white p-4 text-xs text-red-700 whitespace-pre-wrap">
          {errorMsg}
        </pre>
      )}

      {/* Content */}
      <div className="mt-8 text-sm text-gray-900">
        {loading && <p>불러오는 중...</p>}
        {!loading && !data && <p>프로젝트를 찾을 수 없어요.</p>}

        {/* Tabs: 소유자 4탭 / 참여 멤버는 프로젝트·기획 상세 */}
        {!loading && data && isOwner && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {ownerTabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors
                  ${
                    tab === t
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {t === "overview"
                  ? "개요"
                  : t === "schedule"
                  ? "일정"
                  : t === "board"
                  ? "보드"
                  : t === "artifact"
                  ? "아티팩트"
                  : "원본"}
              </button>
            ))}
          </div>
        )}
        {!loading && data && !isOwner && isMember && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors
                ${
                  tab === "overview"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              프로젝트
            </button>
            <button
              type="button"
              onClick={() => setTab("schedule")}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors
                ${
                  tab === "schedule"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              일정
            </button>
            <button
              type="button"
              onClick={() => setTab("artifact")}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors
                ${
                  tab === "artifact"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              기획 상세
            </button>
          </div>
        )}

        {/* Common Cards */}
        {!loading && data && (
          <div className="grid gap-4">
            <DecisionsCard
              decisions={decisions}
              answeredAt={decisionsAnsweredAt}
              schemaVersion={decisionsSchemaVersion}
            />
            <EffectiveSettingsCard policy={policy} />
          </div>
        )}

        {/* Overview tab (소유자) */}
        {!loading && data && isOwner && tab === "overview" && (
          <div className="mt-4 grid gap-6">
            <Card title="요약">
              <div className="text-gray-700">
                <div className="font-semibold">{ideaTitle}</div>
                <p className="mt-2 text-sm text-gray-600">
                  {oneLiner}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    오너 ID: <code>{projectOwnerId ?? "-"}</code>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    모집 마감일: {formatDateTime(project?.deadline ?? null)}
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    프로젝트 마감일: {formatDateTime(project?.endDate ?? null)}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card title="설명">
                <p className="text-gray-600">{project?.descriptionOriginal ?? "-"}</p>
              </Card>

              <MembersSummaryCard
                project={project}
                currentUserId={currentUserId}
                isOwner={isOwner}
                membersData={membersData}
                loading={membersLoading}
                error={membersError}
                busyKey={memberRemovalBusyKey}
                onRequestRemoval={requestMemberRemoval}
                onApproveRemoval={approveMemberRemoval}
              />
            </div>

            <KanbanSummaryCard
              board={board}
              loading={boardLoading}
              error={boardError}
            />

            <ArtifactSummaryCard
              latestArtifact={latestArtifact}
              featuresCount={featuresCount}
            />
          </div>
        )}

        {/* 방문자·참여 멤버(프로젝트 탭): 요약·설명 + 칸반 */}
        {!loading &&
          data &&
          !isOwner &&
          (!isMember || (isMember && tab === "overview")) && (
          <div className="mt-4 grid gap-6">
            <Card title="요약">
              <div className="text-gray-700">
                <div className="font-semibold">{ideaTitle}</div>
                <p className="mt-2 text-sm text-gray-600">{oneLiner}</p>
                <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    오너 ID: <code>{projectOwnerId ?? "-"}</code>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    모집 마감일: {formatDateTime(project?.deadline ?? null)}
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    프로젝트 마감일: {formatDateTime(project?.endDate ?? null)}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card title="설명">
                <p className="text-gray-600">{project?.descriptionOriginal ?? "-"}</p>
              </Card>
              <MembersSummaryCard
                project={project}
                currentUserId={currentUserId}
                isOwner={isOwner}
                membersData={membersData}
                loading={membersLoading}
                error={membersError}
                busyKey={memberRemovalBusyKey}
                onRequestRemoval={requestMemberRemoval}
                onApproveRemoval={approveMemberRemoval}
              />
            </div>

            <ArtifactSummaryCard
              latestArtifact={latestArtifact}
              featuresCount={featuresCount}
            />

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">작업 보드</h2>
              <p className="mt-1 text-xs text-gray-500">
                아래에서 카드를 추가·수정할 수 있어요.
              </p>
              <div className="mt-4">
                {boardError ? (
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">
                    {boardError}
                  </pre>
                ) : boardLoading ? (
                  <div className="text-sm text-gray-500">보드를 불러오는 중...</div>
                ) : !board ? (
                  <div className="text-sm text-gray-500">
                    칸반 보드를 찾을 수 없어요.
                  </div>
                ) : (
                  <KanbanBoardDndView
                    projectId={projectId}
                    board={board}
                    setBoard={(b) => setBoard(b)}
                    refetchBoard={fetchBoard}
                    onAddCard={(columnId, columnTitle) =>
                      openAddCardModal(columnId, columnTitle)
                    }
                    onEditCard={(card, columnTitle) =>
                      openEditCardModal(card, columnTitle)
                    }
                    onDeleteCard={(cardId, cardTitle, columnTitle) =>
                      openDeleteModal(cardId, cardTitle, columnTitle)
                    }
                  />
                )}
              </div>
            </section>
          </div>
        )}

        {/* 참여 멤버 — 기획 상세 (DraftViewer 읽기 전용) */}
        {!loading && data && !isOwner && isMember && tab === "artifact" && (
          <div className="mt-4 grid gap-6">
            <p className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-xs text-indigo-900">
              확정 시 연결된 AI 기획 산출물이에요. 화면·API·ERD 등은 읽기만 가능하고, 수정·재생성은
              프로젝트 소유자만 할 수 있어요.
            </p>
            {!latestArtifact ? (
              <p className="text-sm text-gray-500">연결된 기획 문서가 없어요.</p>
            ) : (
              <>
                <Card
                  title="기획 산출물"
                  right={<Badge tone="gray">{latestArtifact.meta.id}</Badge>}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="indigo">{latestArtifact.meta.type}</Badge>
                    <Badge tone="gray">버전 {latestArtifact.meta.version}</Badge>
                  </div>
                </Card>
                <DraftViewer contentJson={latestArtifact.contentJson} />
              </>
            )}
          </div>
        )}

        {/* Schedule tab (오너/멤버) */}
        {!loading && data && (isOwner || isMember) && tab === "schedule" && (
          <div className="mt-4 grid gap-6">
            <ProjectSchedule projectId={projectId} />
          </div>
        )}

        {/* Board tab (소유자) */}
        {!loading && data && isOwner && tab === "board" && (
          <div className="mt-4 grid gap-6">
            <KanbanSummaryCard
              board={board}
              loading={boardLoading}
              error={boardError}
            />

            {boardError ? null : boardLoading ? (
              <div className="text-sm text-gray-500">보드를 불러오는 중...</div>
            ) : !board ? (
              <div className="text-sm text-gray-500">
                칸반 보드를 찾을 수 없어요.
              </div>
            ) : (
              <KanbanBoardDndView
                projectId={projectId}
                board={board}
                setBoard={(b) => setBoard(b)}
                refetchBoard={fetchBoard}
                onAddCard={(columnId, columnTitle) =>
                  openAddCardModal(columnId, columnTitle)
                }
                onEditCard={(card, columnTitle) =>
                  openEditCardModal(card, columnTitle)
                }
                onDeleteCard={(cardId, cardTitle, columnTitle) =>
                  openDeleteModal(cardId, cardTitle, columnTitle)
                }
              />
            )}
          </div>
        )}

        {/* Artifact tab */}
        {!loading && data && isOwner && tab === "artifact" && (
          <div className="mt-4 grid gap-6">
            {!latestArtifact ? (
              <p className="text-gray-500">최신 아티팩트가 없어요.</p>
            ) : (
              <>
                <Card
                  title="아티팩트 메타"
                  right={<Badge tone="gray">{latestArtifact.meta.id}</Badge>}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="indigo">{latestArtifact.meta.type}</Badge>
                    <Badge tone="gray">
                      버전 {latestArtifact.meta.version}
                    </Badge>
                    <Badge tone="gray">
                      {latestArtifact.meta.promptHash ?? "promptHash 없음"}
                    </Badge>
                  </div>
                </Card>

                <DraftViewer contentJson={latestArtifact.contentJson} />
              </>
            )}

            <Card title="AI 수정 요청">
              <p className="text-xs text-gray-500">
                원하는 변경사항을 적으면 새 버전으로 생성돼요.
              </p>
              <textarea
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                placeholder="예: API 섹션을 더 구체적으로, ERD는 최소 엔티티 3개로"
                rows={3}
                className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <button
                onClick={async () => {
                  if (!latestArtifactId || !revisionText.trim()) return;
                  setRevisionSubmitting(true);
                  try {
                    const res = await fetch(
                      `/api/ai/artifacts/${latestArtifactId}/revise`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          instruction: revisionText.trim(),
                        }),
                      }
                    );
                    const text = await res.text();
                    if (!res.ok) {
                      alert(
                        `수정 실패: ${res.status} ${res.statusText}\n${text}`
                      );
                      setRevisionSubmitting(false);
                      return;
                    }
                    setRevisionText("");
                    await fetchArtifacts();
                  } catch (e) {
                    alert(`수정 실패: ${String(e)}`);
                  } finally {
                    setRevisionSubmitting(false);
                  }
                }}
                disabled={!revisionText.trim() || revisionSubmitting}
                className="mt-3 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {revisionSubmitting ? "수정 중..." : "AI로 수정 요청"}
              </button>
            </Card>

            <Card title="버전 기록">
              {artifactsLoading ? (
                <p className="text-sm text-gray-500">불러오는 중...</p>
              ) : artifactsError ? (
                <pre className="text-xs text-red-600 whitespace-pre-wrap">
                  {artifactsError}
                </pre>
              ) : artifacts.length === 0 ? (
                <p className="text-sm text-gray-500">버전 기록이 없어요.</p>
              ) : (
                <div className="grid gap-2">
                  {artifacts.map((a) => {
                    const approval = a?.contentJson?.approval;
                    const revision = a?.contentJson?.revision;
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                            v{a.version}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(a.createdAt).toLocaleString()}
                          </span>
                          {approval?.approvedAt && (
                            <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                              승인됨
                            </span>
                          )}
                          <button
                            onClick={() =>
                              window.open(`/drafts/${a.id}`, "_blank")
                            }
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                          >
                            이 버전 보기
                          </button>
                          {!approval?.approvedAt && (
                            <button
                              onClick={async () => {
                                const res = await fetch(
                                  `/api/ai/artifacts/${a.id}/approve`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({}),
                                  }
                                );
                                const text = await res.text();
                                if (!res.ok) {
                                  alert(
                                    `승인 실패: ${res.status} ${res.statusText}\n${text}`
                                  );
                                  return;
                                }
                                await fetchArtifacts();
                              }}
                              className="ml-auto rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                            >
                              이 버전 승인
                            </button>
                          )}
                        </div>
                        {revision?.instruction && (
                          <div className="mt-2 text-xs text-gray-600">
                            수정 지시: {revision.instruction}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Raw tab */}
        {!loading && data && isOwner && tab === "raw" && (
          <pre className="mt-4 whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
      </div>

      {/* Modals */}
      <AddCardModal
        open={addModalOpen}
        columnTitle={addTargetColumn?.columnTitle ?? ""}
        title={newCardTitle}
        setTitle={setNewCardTitle}
        desc={newCardDesc}
        setDesc={setNewCardDesc}
        due={newCardDue}
        setDue={setNewCardDue}
        submitting={newCardSubmitting}
        onClose={closeAddCardModal}
        onSubmit={submitNewCard}
      />

      <EditCardModal
        open={editModalOpen}
        columnTitle={editTarget?.columnTitle ?? ""}
        title={editTitle}
        setTitle={setEditTitle}
        desc={editDesc}
        setDesc={setEditDesc}
        due={editDue}
        setDue={setEditDue}
        submitting={editSubmitting}
        onClose={closeEditCardModal}
        onSubmit={submitEditCard}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        submitting={deleteSubmitting}
        title={deleteTarget?.cardTitle ?? ""}
        columnTitle={deleteTarget?.columnTitle ?? ""}
        onClose={closeDeleteModal}
        onSubmit={submitDelete}
      />

      {joinModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setJoinModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">참가 신청</h3>
            <p className="mt-1 text-xs text-gray-500">
              프로젝트 오너에게 신청 알림이 전달됩니다.
            </p>
            <textarea
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="간단한 소개 (선택)"
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setJoinModalOpen(false);
                  setApplyMessage("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={participationBusy}
                onClick={async () => {
                  const token = getAccessToken();
                  if (!token) return;
                  setParticipationBusy(true);
                  try {
                    await apiPostProjectApplication(projectId, {
                      message: applyMessage.trim() || undefined,
                    });
                    alert("참가 신청을 보냈습니다.");
                    setJoinModalOpen(false);
                    setApplyMessage("");
                  } catch (e) {
                    alert(String(e));
                    return;
                  } finally {
                    setParticipationBusy(false);
                  }
                  try {
                    await reloadParticipation();
                  } catch {
                    // 신청은 반영됨. 참가 상태만 갱신 실패 — UI는 다음 로드/새로고침에서 맞춰짐
                  }
                }}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                신청하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeDecisionValue(v: any): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "string") return v;
  if (typeof v === "number" || v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function DecisionsCard({
  decisions,
  answeredAt,
  schemaVersion,
}: {
  decisions?: Record<string, any> | null;
  answeredAt?: string | null;
  schemaVersion?: string | number | null;
}) {
  const entries = decisions ? Object.entries(decisions) : [];
  const totalPossible = Object.keys(DECISION_META).length;
  const answeredCount = entries.length;

  const grouped: Record<
    string,
    { key: string; label: string; value: string; order: number }[]
  > = {};

  for (const [key, raw] of entries) {
    const meta = DECISION_META[key];
    const section = meta?.section ?? "기타";
    const label = meta?.label ?? key;
    const value = meta?.format ? meta.format(raw) : normalizeDecisionValue(raw);
    const order = meta?.order ?? 999;

    grouped[section] ??= [];
    grouped[section].push({ key, label, value, order });
  }

  const sectionOrder = ["인증", "레포", "프로젝트", "기타"];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">결정사항</h2>
          <p className="text-xs text-gray-500">드래프트 질문 기반</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">응답</div>
          <div className="text-sm font-semibold text-gray-900">{answeredCount}/{totalPossible}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span>응답 시각</span>
          <span className="font-medium text-gray-900">{answeredAt ? new Date(answeredAt).toLocaleString() : "-"}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span>스키마 버전</span>
          <span className="font-medium text-gray-900">{schemaVersion ?? "-"}</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          아직 저장된 결정 사항이 없어요. (드래프트에서 질문을 선택하고
          Confirm하면 여기에 표시돼요.)
        </p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {sectionOrder
            .filter((s) => (grouped[s]?.length ?? 0) > 0)
            .map((section) => {
              const items = [...(grouped[section] ?? [])].sort(
                (a, b) => a.order - b.order
              );
              return (
                <div
                  key={section}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="mb-2 text-sm font-semibold text-gray-800">{section}</div>

                  <div className="space-y-2">
                    {items.map((it) => (
                      <div
                        key={it.key}
                        className="flex items-start justify-between gap-4 rounded-md bg-white px-2 py-1 text-sm"
                      >
                        <span className="text-gray-600">{it.label}</span>
                        <span className="font-medium text-gray-900">{it.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}

function EffectiveSettingsCard({ policy }: { policy: any }) {
  if (!policy) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">적용 설정</h2>
        <span className="text-xs text-gray-500">결정사항 기반</span>
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span className="text-gray-600">인증</span>
          <span className="font-medium">
            {policy?.auth?.loginMethod === "GITHUB_ONLY"
              ? "GitHub OAuth만"
              : policy?.auth?.loginMethod === "GITHUB_EMAIL"
              ? "GitHub + Email"
              : "알 수 없음"}
          </span>
        </div>

        <div className="flex justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span className="text-gray-600">프로젝트당 레포</span>
          <span className="font-medium">
            {policy?.repo?.perProject === 1
              ? "1개"
              : policy?.repo?.perProject === "MANY"
              ? "여러 개"
              : "알 수 없음"}
          </span>
        </div>
      </div>
    </section>
  );
}

function MembersSummaryCard({ project }: { project?: Project }) {
  return (
    <Card title="멤버">
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span>총 멤버 수</span>
          <span className="font-medium text-gray-900">1</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
          <span>오너</span>
          <span className="font-medium text-gray-900">{project?.ownerId ?? "-"}</span>
        </div>
      </div>
    </Card>
  );
}

function ArtifactSummaryCard({
  latestArtifact,
  featuresCount,
}: {
  latestArtifact: LatestArtifact | null;
  featuresCount: number;
}) {
  return (
    <Card
      title="최신 아티팩트"
      right={
        latestArtifact ? (
          <Badge tone="gray">{latestArtifact.meta.type}</Badge>
        ) : (
          <Badge tone="gray">none</Badge>
        )
      }
    >
      {!latestArtifact ? (
        <p className="text-gray-500">아직 연결된 AI 산출물이 없어요.</p>
      ) : (
        <div className="grid gap-2 text-sm text-gray-600">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span>기능 수</span>
            <span className="font-medium text-gray-900">{featuresCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span>버전</span>
            <span className="font-medium text-gray-900">{latestArtifact.meta.version}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span>업데이트</span>
            <span className="font-medium text-gray-900">
              {new Date(latestArtifact.meta.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

function KanbanSummaryCard({
  board,
  loading,
  error,
}: {
  board: KanbanBoardLike | null;
  loading: boolean;
  error: string | null;
}) {
  const columns = board?.columns ?? [];

  const totalCards = Array.isArray(columns)
    ? columns.reduce((acc: number, c: any) => acc + (c?.cards?.length ?? 0), 0)
    : 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">칸반</h2>
        <span className="text-xs text-gray-500">Confirm 시 자동 생성</span>
      </div>

      {error ? (
        <pre className="mt-3 text-xs text-red-600 whitespace-pre-wrap">
          {error}
        </pre>
      ) : loading ? (
        <p className="mt-3 text-sm text-gray-600">불러오는 중...</p>
      ) : !board ? (
        <p className="mt-3 text-sm text-gray-600">칸반 보드를 찾을 수 없어요.</p>
      ) : (
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span className="text-gray-600">컬럼 수</span>
            <span className="font-medium">{columns.length}</span>
          </div>
          <div className="flex justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span className="text-gray-600">카드 수</span>
            <span className="font-medium">{totalCards}</span>
          </div>

          <div className="mt-2 grid gap-2">
            {columns.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
              >
                <span className="font-medium">{c.title}</span>
                <span className="text-xs text-gray-500">{c.cards?.length ?? 0}개</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function KanbanBoardView({
  board,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: {
  board: KanbanBoardLike;
  onAddCard: (columnId: string, columnTitle: string) => void;
  onEditCard: (card: KanbanCardLike, columnTitle: string) => void;
  onDeleteCard: (
    cardId: string,
    cardTitle: string,
    columnTitle: string
  ) => void;
}) {
  const columns = board?.columns ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{c.title}</div>
              <div className="text-xs text-gray-500">{c.cards?.length ?? 0} cards</div>
            </div>

            <button
              onClick={() => onAddCard(c.id, c.title)}
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
              title="이 컬럼에 카드 추가"
            >
              + 카드 추가
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {(c.cards ?? []).map((card) => (
              <div
                key={card.id}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{card.title}</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditCard(card, c.title)}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold hover:bg-gray-100"
                      title="카드 수정"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDeleteCard(card.id, card.title, c.title)}
                      className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      title="카드 삭제"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {card.description && (
                  <div className="mt-1 text-xs text-gray-600 line-clamp-2">
                    {card.description}
                  </div>
                )}
                {card.dueDate && (
                  <div className="mt-1 text-xs text-gray-500">
                    due: {new Date(card.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}

            {(c.cards ?? []).length === 0 && (
              <div className="text-xs text-gray-500">카드 없음</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddCardModal({
  open,
  columnTitle,
  title,
  setTitle,
  desc,
  setDesc,
  due,
  setDue,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  columnTitle: string;
  title: string;
  setTitle: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  due: string;
  setDue: (v: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const canSubmit = title.trim().length > 0 && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">카드 추가</h3>
            <p className="mt-1 text-xs text-gray-500">
              컬럼: <span className="font-semibold">{columnTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">제목 *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: ERD 초안 작성"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">설명</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="예: 엔티티 3개 이상, 관계 포함"
              rows={3}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">마감일</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            취소
          </button>
          <button
            disabled={!canSubmit}
            onClick={onSubmit}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "추가 중..." : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditCardModal({
  open,
  columnTitle,
  title,
  setTitle,
  desc,
  setDesc,
  due,
  setDue,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  columnTitle: string;
  title: string;
  setTitle: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  due: string;
  setDue: (v: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const canSubmit = title.trim().length > 0 && !submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">카드 수정</h3>
            <p className="mt-1 text-xs text-gray-500">
              컬럼: <span className="font-semibold">{columnTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">제목 *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: ERD 초안 작성"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">설명</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="예: 엔티티 3개 이상, 관계 포함"
              rows={3}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold">마감일</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-gray-500">
              비우면 마감일이 제거돼요.
            </p>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            취소
          </button>
          <button
            disabled={!canSubmit}
            onClick={onSubmit}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  open,
  submitting,
  title,
  columnTitle,
  onClose,
  onSubmit,
}: {
  open: boolean;
  submitting: boolean;
  title: string;
  columnTitle: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">카드 삭제</h3>
            <p className="mt-1 text-xs text-gray-500">
              컬럼: <span className="font-semibold">{columnTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          이 카드를 삭제할까요?
          <div className="mt-1 font-semibold break-words">“{title}”</div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            취소
          </button>
          <button
            disabled={submitting}
            onClick={onSubmit}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {submitting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
