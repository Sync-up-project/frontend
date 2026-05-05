"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { getAccessToken, getApiBaseUrl } from "@/lib/auth";

type ChatTab = "project" | "dm";

/** Prisma Language 와 동일: KO / EN / JA */
type ChatLang = "KO" | "EN" | "JA";

type ServerChatMessage = {
  id: string;
  senderId?: string;
  username: string;
  message: string;
  originalLang?: ChatLang;
  translations?: Partial<Record<ChatLang, string>>;
  timestamp: string | Date;
};

type UiMessage = {
  id: string;
  side: "me" | "other";
  senderName: string;
  /** 현재 선택한 표시 언어로 계산된 텍스트 */
  text: string;
  /** 서버가 저장한 원문 */
  originalText: string;
  originalLang: ChatLang;
  translations?: Partial<Record<ChatLang, string>>;
  timeText: string;
  /** 과거 메시지 페이지네이션용 */
  createdAtIso?: string;
};

const CHAT_CACHE_MAX = 50;

function chatCacheKey(projectId: string) {
  return `syncup_chat_cache_v3:${projectId}`;
}

function mapProfileLang(raw: unknown): ChatLang {
  if (raw === "KO" || raw === "EN" || raw === "JA") return raw;
  return "KO";
}

function computeDisplayText(
  originalText: string,
  originalLang: ChatLang,
  translations: Partial<Record<ChatLang, string>> | undefined,
  displayLang: ChatLang
): string {
  if (displayLang === originalLang) return originalText;
  const t = translations?.[displayLang];
  return typeof t === "string" && t.trim().length > 0 ? t : originalText;
}

function readChatCache(projectId: string, displayLang: ChatLang): UiMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(chatCacheKey(projectId));
    if (!raw) return null;
    const j = JSON.parse(raw) as { messages?: unknown };
    if (!Array.isArray(j.messages)) return null;
    const out: UiMessage[] = [];
    for (const row of j.messages) {
      const n = normalizeCachedRow(row, displayLang);
      if (n) out.push(n);
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function writeChatCache(projectId: string, messages: UiMessage[]) {
  if (typeof window === "undefined") return;
  try {
    const tail = messages.slice(-CHAT_CACHE_MAX);
    sessionStorage.setItem(chatCacheKey(projectId), JSON.stringify({ messages: tail }));
  } catch {
    /* ignore quota */
  }
}

function parseMessageHistoryPayload(raw: unknown): {
  messages: ServerChatMessage[];
  hasMore: boolean;
} {
  if (Array.isArray(raw)) {
    return { messages: raw as ServerChatMessage[], hasMore: false };
  }
  if (raw && typeof raw === "object" && "messages" in raw) {
    const o = raw as { messages?: ServerChatMessage[]; hasMore?: boolean };
    return {
      messages: Array.isArray(o.messages) ? o.messages : [],
      hasMore: Boolean(o.hasMore),
    };
  }
  return { messages: [], hasMore: false };
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(ts: string | Date) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function serverMessageToUi(
  m: ServerChatMessage,
  myId: string | null,
  displayLang: ChatLang
): UiMessage {
  const ts = m.timestamp;
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const createdAtIso = Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  const sid = m.senderId ?? "";
  const side = myId && sid && sid === myId ? "me" : "other";
  const originalLang: ChatLang =
    m.originalLang === "EN" || m.originalLang === "JA" || m.originalLang === "KO"
      ? m.originalLang
      : "KO";
  const originalText = m.message;
  const translations = m.translations;
  const text = computeDisplayText(originalText, originalLang, translations, displayLang);
  return {
    id: String(m.id),
    side,
    senderName: m.username,
    text,
    originalText,
    originalLang,
    translations,
    timeText: formatTime(ts),
    createdAtIso,
  };
}

/** 캐시(v2) 등 구형 필드 보정 */
function normalizeCachedRow(row: unknown, displayLang: ChatLang): UiMessage | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Partial<UiMessage>;
  if (!r.id || !r.side || !r.senderName || typeof r.text !== "string") return null;
  const originalLang: ChatLang =
    r.originalLang === "EN" || r.originalLang === "JA" || r.originalLang === "KO"
      ? r.originalLang
      : "KO";
  const originalText =
    typeof r.originalText === "string" ? r.originalText : r.text;
  const translations = r.translations;
  return {
    id: String(r.id),
    side: r.side,
    senderName: String(r.senderName),
    originalText,
    originalLang,
    translations,
    text: computeDisplayText(originalText, originalLang, translations, displayLang),
    timeText: String(r.timeText ?? ""),
    createdAtIso: r.createdAtIso,
  };
}

function getStoredActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.localStorage.getItem("syncup_active_project_id") ??
      window.localStorage.getItem("syncup_last_project_id")
    );
  } catch {
    return null;
  }
}

function parseProjectIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/projects\/([^\/\?]+)(\/|$)/);
  if (!m) return null;
  return decodeURIComponent(m[1]);
}

async function fetchMe(): Promise<{ id: string | null; chatLang: ChatLang }> {
  const token = getAccessToken();
  if (!token) return { id: null, chatLang: "KO" };

  const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) return { id: null, chatLang: "KO" };

  const json = await res.json();
  const u = json?.user ?? json;
  const id = u?.id ? String(u.id) : null;
  const chatLang = mapProfileLang(u?.primaryLanguage);
  return { id, chatLang };
}

async function patchPrimaryLanguage(lang: ChatLang): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return false;

  const res = await fetch(`${getApiBaseUrl()}/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ primaryLanguage: lang }),
  });

  return res.ok;
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

function langLabel(lang: ChatLang): string {
  if (lang === "KO") return "KO";
  if (lang === "EN") return "EN";
  return "JA";
}

function MessageBubble({
  m,
  displayLang,
}: {
  m: UiMessage;
  displayLang: ChatLang;
}) {
  const isMe = m.side === "me";
  const showingTranslation =
    displayLang !== m.originalLang &&
    typeof m.translations?.[displayLang] === "string" &&
    (m.translations![displayLang]!.trim().length ?? 0) > 0;

  return (
    <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
      <div className="max-w-[78%]">
        <div className={cn("text-xs text-gray-500 mb-1", isMe ? "text-right" : "text-left")}>
          {isMe ? "나" : m.senderName}
          {showingTranslation ? (
            <span className="ml-2 text-[10px] text-gray-400">
              · 원문 {langLabel(m.originalLang)} → {langLabel(displayLang)}
            </span>
          ) : null}
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

  // ✅ 로그인한 상태에서만 채팅 위젯 노출 + 토큰/세션 변경 시 최신 언어설정 동기화
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    let cancelled = false;

    async function syncAuthAndProfile() {
      const authed = Boolean(getAccessToken());
      setIsAuthed(authed);
      if (!authed) {
        setMyId(null);
        return;
      }
      const { id, chatLang: lang } = await fetchMe();
      if (cancelled) return;
      setMyId(id);
      setChatLang(lang);
      chatLangRef.current = lang;
    }

    void syncAuthAndProfile();

    function onAuthChanged() {
      void syncAuthAndProfile();
    }

    window.addEventListener("auth:changed", onAuthChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("auth:changed", onAuthChanged);
    };
  }, []);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>("project");

  const [unreadTotal, setUnreadTotal] = useState<number>(1);

  const [myId, setMyId] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string>("나");
  const [chatLang, setChatLang] = useState<ChatLang>("KO");

  const [projectId, setProjectId] = useState<string | null>(null);
  const [fallbackProjectId, setFallbackProjectId] = useState<string | null>(null);
  const [joinStatus, setJoinStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [userCount, setUserCount] = useState<number>(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [langSaving, setLangSaving] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<any>(null);
  const myIdRef = useRef<string | null>(null);
  const loadingOlderRef = useRef(false);
  const scrollRestoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);
  const loadOlderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveProjectIdRef = useRef<string | null>(null);
  const chatLangRef = useRef<ChatLang>("KO");
  const messagesRef = useRef<UiMessage[]>([]);
  const hasMoreOlderRef = useRef(false);
  const myNicknameRef = useRef(myNickname);

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    myNicknameRef.current = myNickname;
  }, [myNickname]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    hasMoreOlderRef.current = hasMoreOlder;
  }, [hasMoreOlder]);

  useEffect(() => {
    chatLangRef.current = chatLang;
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        text: computeDisplayText(
          m.originalText,
          m.originalLang,
          m.translations,
          chatLang
        ),
      }))
    );
  }, [chatLang]);

  useOnClickOutside([panelRef, buttonRef], () => setOpen(false), open);
  useEscapeClose(() => setOpen(false), open);

  useEffect(() => {
    if (!isAuthed) {
      setFallbackProjectId(null);
      return;
    }
    const stored = getStoredActiveProjectId();
    setFallbackProjectId(stored);
  }, [isAuthed]);

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
    // 로그아웃 시: 열려있던 패널 닫고 소켓 정리
    if (isAuthed) return;
    setChatLang("KO");
    chatLangRef.current = "KO";
    setOpen(false);
    setJoinStatus("idle");
    setJoinError(null);
    setUserCount(0);
    setTypingUsers({});
    setMessages([]);
    setHasMoreOlder(false);
    setLoadingOlder(false);

    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }
  }, [isAuthed]);

  useEffect(() => {
    if (!open) return;
    setUnreadTotal(0);
  }, [open]);

  const effectiveProjectId = useMemo(() => {
    return projectId ?? fallbackProjectId;
  }, [projectId, fallbackProjectId]);

  useEffect(() => {
    effectiveProjectIdRef.current = effectiveProjectId ?? null;
  }, [effectiveProjectId]);

  const canUseProjectChat = useMemo(() => {
    return Boolean(myId && effectiveProjectId);
  }, [myId, effectiveProjectId]);

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

    const s = io(`${getApiBaseUrl()}/chat`, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = s;

    s.on("disconnect", () => {
      setJoinStatus("idle");
      setUserCount(0);
      setTypingUsers({});
      setHasMoreOlder(false);
      setLoadingOlder(false);
      loadingOlderRef.current = false;
    });

    s.on("messageHistory", (raw: unknown) => {
      const { messages: rawMsgs, hasMore } = parseMessageHistoryPayload(raw);
      const uid = myIdRef.current;
      const lang = chatLangRef.current;
      const mapped = rawMsgs.map((m) => serverMessageToUi(m, uid, lang));
      setMessages(mapped);
      setHasMoreOlder(hasMore);
      const pid = effectiveProjectIdRef.current;
      if (pid) writeChatCache(pid, mapped);
      queueMicrotask(() => {
        const el = messagesScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });

    s.on("message", (m: ServerChatMessage) => {
      setMessages((prev) => {
        if (prev.some((p) => p.id === String(m.id))) return prev;
        const row = serverMessageToUi(m, myIdRef.current, chatLangRef.current);
        const next = [...prev, row];
        const pid = effectiveProjectIdRef.current;
        if (pid) writeChatCache(pid, next);
        return next;
      });
    });

    s.on("userCount", (count: number) => {
      setUserCount(Number(count ?? 0));
    });

    s.on("typing", (payload: { username: string; isTyping: boolean }) => {
      const u = payload?.username ?? "";
      if (!u) return;
      if (u === myNicknameRef.current) return;
      setTypingUsers((prev) => ({ ...prev, [u]: Boolean(payload.isTyping) }));
    });

    return s;
  }

  function loadOlderMessages() {
    const s = socketRef.current;
    const pid = effectiveProjectIdRef.current;
    if (!s || !pid) return;
    if (!hasMoreOlderRef.current || loadingOlderRef.current) return;
    const first = messagesRef.current[0];
    if (!first?.createdAtIso) return;

    const el = messagesScrollRef.current;
    if (el) {
      scrollRestoreRef.current = { prevHeight: el.scrollHeight, prevTop: el.scrollTop };
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    s.emit("loadOlderMessages", { beforeCreatedAt: first.createdAtIso }, (ack: any) => {
      loadingOlderRef.current = false;
      setLoadingOlder(false);

      if (ack?.status !== "ok" || !Array.isArray(ack.messages)) {
        scrollRestoreRef.current = null;
        return;
      }

      const uid = myIdRef.current;
      const lang = chatLangRef.current;
      const older = (ack.messages as ServerChatMessage[]).map((msg) =>
        serverMessageToUi(msg, uid, lang)
      );

      setMessages((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        const merged = older.filter((o) => !existing.has(o.id));
        const next = [...merged, ...prev];
        if (pid) writeChatCache(pid, next);
        return next;
      });

      setHasMoreOlder(Boolean(ack.hasMore));
    });
  }

  function onMessagesScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop > 80) return;
    if (!hasMoreOlderRef.current || loadingOlderRef.current) return;
    const first = messagesRef.current[0];
    if (!first?.createdAtIso) return;

    if (loadOlderDebounceRef.current) clearTimeout(loadOlderDebounceRef.current);
    loadOlderDebounceRef.current = setTimeout(() => {
      loadOlderDebounceRef.current = null;
      loadOlderMessages();
    }, 120);
  }

  useLayoutEffect(() => {
    const p = scrollRestoreRef.current;
    const el = messagesScrollRef.current;
    if (!p || !el) return;
    scrollRestoreRef.current = null;
    el.scrollTop = el.scrollHeight - p.prevHeight + p.prevTop;
  }, [messages]);

  async function joinProjectRoom() {
    const targetProjectId = effectiveProjectId;

    if (!myId || !targetProjectId) {
      setJoinStatus("error");
      setJoinError("참여 중인 프로젝트가 없어서 채팅에 연결할 수 없습니다.");
      return;
    }

    setJoinStatus("joining");
    setJoinError(null);
    setLoadingOlder(false);
    loadingOlderRef.current = false;

    // 입장 직전 서버의 primaryLanguage 를 다시 받아 캐시/표시/번역 기준을 맞춤 (첫 로드·재입장·타 화면에서 설정 변경 후 동일)
    const { chatLang: langFromServer } = await fetchMe();
    setChatLang(langFromServer);
    chatLangRef.current = langFromServer;

    const cached = readChatCache(targetProjectId, langFromServer);
    if (cached?.length) {
      setMessages(cached);
      setHasMoreOlder(true);
    } else {
      setMessages([]);
      setHasMoreOlder(false);
    }

    const s = connectSocketIfNeeded();

    s.emit("join", { userId: myId, projectId: targetProjectId }, (ack: any) => {
      if (ack?.status === "joined") {
        setJoinStatus("joined");
        setJoinError(null);
        if (ack?.username) setMyNickname(String(ack.username));
        try {
          localStorage.setItem("syncup_active_project_id", targetProjectId);
        } catch {}
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
    setHasMoreOlder(false);
    setLoadingOlder(false);
    loadingOlderRef.current = false;
    scrollRestoreRef.current = null;
    if (loadOlderDebounceRef.current) {
      clearTimeout(loadOlderDebounceRef.current);
      loadOlderDebounceRef.current = null;
    }

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

    s.emit("message", { message: text, sourceLang: chatLang }, () => {
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
      setJoinError("참여 가능한 프로젝트 채팅방이 없습니다.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, canUseProjectChat]);

  // 로그인하지 않은 상태에서는 위젯 자체를 렌더링하지 않음
  if (!isAuthed) return null;

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
                    <span className="font-mono">{effectiveProjectId ?? "-"}</span>
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

            {tab === "project" ? (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="syncup-chat-lang" className="text-xs font-bold text-gray-600 shrink-0">
                    내 언어
                  </label>
                  <select
                    id="syncup-chat-lang"
                    value={chatLang}
                    disabled={langSaving}
                    onChange={async (e) => {
                      const next = e.target.value as ChatLang;
                      setLangSaving(true);
                      try {
                        const ok = await patchPrimaryLanguage(next);
                        if (ok) setChatLang(next);
                      } finally {
                        setLangSaving(false);
                      }
                    }}
                    className="flex-1 min-w-0 h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-800 disabled:opacity-60"
                    aria-label="계정 기본 언어 및 채팅 표시 언어"
                  >
                    <option value="KO">한국어 (KO)</option>
                    <option value="EN">English (EN)</option>
                    <option value="JA">日本語 (JA)</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">
                  계정의 기본 언어 설정과 같습니다. 바꾸면 프로필의 언어도 함께 저장됩니다.
                </p>
              </div>
            ) : null}
          </div>

          {/* Body */}
          <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <div className="text-sm font-extrabold text-gray-900 truncate">
                {tab === "project" ? "프로젝트 채팅" : "개인 채팅(준비중)"}
              </div>
              {typingText ? <div className="mt-1 text-xs text-gray-500">{typingText}</div> : null}
            </div>

            <div
              ref={messagesScrollRef}
              onScroll={onMessagesScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
            >
              {loadingOlder ? (
                <div className="text-center text-xs text-gray-400 py-2">이전 메시지 불러오는 중…</div>
              ) : null}
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
                messages.map((m) => (
                  <MessageBubble key={m.id} m={m} displayLang={chatLang} />
                ))
              )}
            </div>

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