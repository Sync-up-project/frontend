"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth";

type ChatTab = "project" | "dm";

type ServerChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: string | Date;
};

type UiMessage = {
  id: string;
  side: "me" | "other";
  senderName: string;
  text: string;
  timeText: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(ts: string | Date) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function parseProjectIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/projects\/([^\/\?]+)(\/|$)/);
  if (!m) return null;
  return decodeURIComponent(m[1]);
}

async function fetchMyId(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;

  const res = await fetch("http://localhost:3001/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) return null;

  const json = await res.json();
  const id = json?.id ?? json?.user?.id;
  return id ? String(id) : null;
}

function useOnClickOutside(
  refs: Array<React.RefObject<HTMLElement>>,
  handler: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;

    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (!target) return;

      const isInside = refs.some((r) => r.current && r.current.contains(target));
      if (!isInside) handler();
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [refs, handler, enabled]);
}

function useEscapeClose(handler: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handler();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler, enabled]);
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const text = count > 99 ? "99+" : String(count);
  return (
    <span className="absolute -top-1 -right-1 min-w-7 h-7 px-2 rounded-full bg-red-500 text-white text-xs font-extrabold flex items-center justify-center shadow">
      {text}
    </span>
  );
}

function MessageBubble({ m }: { m: UiMessage }) {
  const isMe = m.side === "me";
  return (
    <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
      <div className="max-w-[78%]">
        <div className={cn("text-xs text-gray-500 mb-1", isMe ? "text-right" : "text-left")}>
          {isMe ? "나" : m.senderName}
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border",
            isMe
              ? "text-white border-transparent bg-gradient-to-r from-blue-600 to-purple-600"
              : "bg-white border-gray-200 text-gray-900"
          )}
        >
          {m.text}
        </div>

        <div className={cn("mt-1 text-xs text-gray-400", isMe ? "text-right" : "text-left")}>
          {m.timeText}
        </div>
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const pathname = usePathname();

  const BACKEND_URL = "http://localhost:3001";

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>("project");

  const [unreadTotal, setUnreadTotal] = useState<number>(1);

  const [myId, setMyId] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string>("나");

  const [projectId, setProjectId] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [userCount, setUserCount] = useState<number>(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const typingTimerRef = useRef<any>(null);

  useOnClickOutside([panelRef, buttonRef], () => setOpen(false), open);
  useEscapeClose(() => setOpen(false), open);

  useEffect(() => {
    const pid = parseProjectIdFromPath(pathname);
    setProjectId(pid);

    if (pid) {
      try {
        localStorage.setItem("syncup_last_project_id", pid);
      } catch {}
    }
  }, [pathname]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = await fetchMyId();
      if (!mounted) return;
      setMyId(id);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setUnreadTotal(0);
  }, [open]);

  const canUseProjectChat = useMemo(() => {
    return Boolean(myId && projectId);
  }, [myId, projectId]);

  const typingText = useMemo(() => {
    const names = Object.entries(typingUsers)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (names.length === 0) return "";
    if (names.length === 1) return `${names[0]}님이 입력 중...`;
    return `${names[0]} 외 ${names.length - 1}명 입력 중...`;
  }, [typingUsers]);

  function connectSocketIfNeeded() {
    if (socketRef.current) return socketRef.current;

    const s = io(`${BACKEND_URL}/chat`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = s;

    s.on("disconnect", () => {
      setJoinStatus("idle");
      setUserCount(0);
      setTypingUsers({});
    });

    s.on("messageHistory", (history: ServerChatMessage[]) => {
      setMessages(
        (history ?? []).map((m) => ({
          id: String(m.id),
          side: m.username === myNickname ? "me" : "other",
          senderName: m.username,
          text: m.message,
          timeText: formatTime(m.timestamp),
        }))
      );
    });

    s.on("message", (m: ServerChatMessage) => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(m.id),
          side: m.username === myNickname ? "me" : "other",
          senderName: m.username,
          text: m.message,
          timeText: formatTime(m.timestamp),
        },
      ]);
    });

    s.on("userCount", (count: number) => {
      setUserCount(Number(count ?? 0));
    });

    s.on("typing", (payload: { username: string; isTyping: boolean }) => {
      const u = payload?.username ?? "";
      if (!u) return;
      if (u === myNickname) return;
      setTypingUsers((prev) => ({ ...prev, [u]: Boolean(payload.isTyping) }));
    });

    return s;
  }

  async function joinProjectRoom() {
    if (!myId || !projectId) {
      setJoinStatus("error");
      setJoinError("프로젝트 상세(/projects/[id])에서만 채팅 참여가 가능합니다.");
      return;
    }

    setJoinStatus("joining");
    setJoinError(null);

    const s = connectSocketIfNeeded();

    s.emit("join", { userId: myId, projectId }, (ack: any) => {
      if (ack?.status === "joined") {
        setJoinStatus("joined");
        setJoinError(null);
        if (ack?.username) setMyNickname(String(ack.username));
      } else {
        setJoinStatus("error");
        setJoinError(String(ack?.message ?? "채팅방 입장에 실패했습니다."));
      }
    });
  }

  function leaveAndClose() {
    setOpen(false);
    setJoinStatus("idle");
    setJoinError(null);
    setUserCount(0);
    setTypingUsers({});
    setMessages([]);

    const s = socketRef.current;
    if (s) {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
    }
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    if (tab !== "project") return;
    if (joinStatus !== "joined") return;

    const s = socketRef.current;
    if (!s) return;

    s.emit("message", { message: text }, () => {
      // ack 필요 시 여기서 처리 가능
    });

    setDraft("");
    s.emit("typing", { isTyping: false });
  }

  function emitTyping(isTyping: boolean) {
    const s = socketRef.current;
    if (!s) return;
    if (joinStatus !== "joined") return;
    s.emit("typing", { isTyping });
  }

  useEffect(() => {
    if (!open) return;

    if (tab !== "project") return;

    if (canUseProjectChat) {
      joinProjectRoom();
    } else {
      setJoinStatus("error");
      setJoinError("프로젝트 상세 화면(/projects/[id])에서 채팅이 활성화됩니다.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, canUseProjectChat]);

  return (
    <>
      {/* Floating Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? leaveAndClose() : setOpen(true))}
        className={cn(
          "fixed z-[60] right-6 bottom-6",
          "w-[70px] h-[70px] rounded-full shadow-xl",
          "bg-gradient-to-br from-blue-600 to-purple-600",
          "flex items-center justify-center",
          "hover:scale-[1.02] active:scale-[0.98] transition-transform"
        )}
        aria-label="Open chat"
      >
        <Badge count={unreadTotal} />
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7.5 20.5L4 21l.5-3.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M20 12c0 4-3.6 7-8 7a9.6 9.6 0 0 1-3.8-.8L4.5 20.5l.8-3.7A6.6 6.6 0 0 1 4 12c0-4 3.6-7 8-7s8 3 8 7Z"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="12" r="1" fill="white" />
          <circle cx="12" cy="12" r="1" fill="white" />
          <circle cx="15" cy="12" r="1" fill="white" />
        </svg>
      </button>

      {/* Panel */}
      {open ? (
        <div
          ref={panelRef}
          className={cn(
            // ✅ bottom/top로 높이를 자동 계산해서 하단이 절대 잘리지 않게
            "fixed z-[70] right-6 bottom-24 top-24",
            "w-[420px] max-w-[calc(100vw-48px)]",
            "rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden",
            "flex flex-col"
          )}
          role="dialog"
          aria-label="Chat Panel"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-b from-purple-50 to-white">
            <div className="flex items-center justify-between">
              <div className="text-base font-extrabold text-gray-900">채팅</div>
              <button
                type="button"
                onClick={leaveAndClose}
                className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-3 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setTab("project")}
                className={cn(
                  "py-2 rounded-lg text-sm font-extrabold transition-colors",
                  tab === "project" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"
                )}
              >
                프로젝트 채팅
              </button>
              <button
                type="button"
                onClick={() => setTab("dm")}
                className={cn(
                  "py-2 rounded-lg text-sm font-extrabold transition-colors",
                  tab === "dm" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-900"
                )}
              >
                개인 채팅
              </button>
            </div>

            {/* Status Row */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
              <div className="truncate">
                {tab === "project" ? (
                  <>
                    <span className="font-bold text-gray-800">프로젝트:</span>{" "}
                    <span className="font-mono">{projectId ?? "-"}</span>
                    <span className="ml-2 text-gray-400">·</span>
                    <span className="ml-2">접속 {userCount}명</span>
                  </>
                ) : (
                  <span>개인 채팅은 백엔드 구현 후 활성화됩니다.</span>
                )}
              </div>

              {tab === "project" && joinStatus === "joining" ? (
                <span className="text-gray-500">입장 중...</span>
              ) : tab === "project" && joinStatus === "joined" ? (
                <span className="text-green-700 font-bold">연결됨</span>
              ) : tab === "project" && joinStatus === "error" ? (
                <span className="text-red-600 font-bold">연결 실패</span>
              ) : null}
            </div>

            {tab === "project" && joinError ? (
              <div className="mt-2 text-xs text-red-600">{joinError}</div>
            ) : null}
          </div>

          {/* Body: ✅ 고정 높이 계산 제거하고 flex-1로 */}
          <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
            {/* Title bar */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <div className="text-sm font-extrabold text-gray-900 truncate">
                {tab === "project" ? "프로젝트 채팅" : "개인 채팅(준비중)"}
              </div>
              {typingText ? <div className="mt-1 text-xs text-gray-500">{typingText}</div> : null}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {tab === "dm" ? (
                <div className="text-sm text-gray-500 text-center py-16">
                  개인 채팅은 백엔드 이벤트/룸 설계가 추가되면 활성화됩니다.
                </div>
              ) : joinStatus !== "joined" ? (
                <div className="text-sm text-gray-500 text-center py-16">
                  프로젝트 상세 페이지에서 채팅이 활성화됩니다.
                  <div className="mt-3">
                    <Link
                      href="/projects"
                      className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      프로젝트로 이동
                    </Link>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-16">메시지가 없습니다</div>
              ) : (
                messages.map((m) => <MessageBubble key={m.id} m={m} />)
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);

                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                    emitTyping(true);
                    typingTimerRef.current = setTimeout(() => emitTyping(false), 900);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-300"
                  disabled={tab !== "project" || joinStatus !== "joined"}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={tab !== "project" || joinStatus !== "joined" || !draft.trim()}
                  className={cn(
                    "h-11 px-4 rounded-xl text-sm font-extrabold transition-colors",
                    tab !== "project" || joinStatus !== "joined" || !draft.trim()
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  )}
                >
                  보내기
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}