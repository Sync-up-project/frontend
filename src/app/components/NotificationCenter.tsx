"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  apiGetNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  type NotificationListItem,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime()) || diffMs < 0) return "";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "방금 전";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}일 전`;
  return date.toLocaleDateString();
}

function getTypeLabel(type: string) {
  const normalized = type.toUpperCase();
  if (normalized === "INVITE") return "초대";
  if (normalized === "APPLICATION") return "신청";
  if (normalized === "INVITE_STATUS") return "초대 상태";
  if (normalized === "PROJECT_UPDATE") return "프로젝트";
  return "알림";
}

function getNotificationHref(item: NotificationListItem) {
  if (item.project?.id) return `/projects/${item.project.id}`;
  return "/projects";
}

export default function NotificationCenter() {
  const { tr } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const unreadLabel = useMemo(() => {
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  }, [unreadCount]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetNotifications(20);
      setItems(Array.isArray(res?.items) ? res.items : []);
      setUnreadCount(Number(res?.unreadCount ?? 0));
    } catch (e: any) {
      setError(e?.message ?? tr("알림을 불러오지 못했습니다.", "通知を読み込めませんでした。"));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function markRead(item: NotificationListItem) {
    if (item.isRead) return;
    setItems((prev) =>
      prev.map((current) =>
        current.id === item.id ? { ...current, isRead: true } : current,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiMarkNotificationRead(item.id);
    } catch {
      load();
    }
  }

  async function markAllRead() {
    if (unreadCount <= 0) return;
    const prevItems = items;
    const prevUnread = unreadCount;
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await apiMarkAllNotificationsRead();
    } catch {
      setItems(prevItems);
      setUnreadCount(prevUnread);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
          "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
          "dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10",
        )}
        aria-label={tr("알림", "通知")}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold leading-5 text-white">
            {unreadLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-white/10">
            <div>
              <div className="text-sm font-bold text-zinc-900 dark:text-white">
                {tr("알림", "通知")}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {tr(`읽지 않은 알림 ${unreadCount}개`, `未読 ${unreadCount}件`)}
              </div>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount <= 0}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {tr("모두 읽음", "すべて既読")}
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tr("불러오는 중", "読み込み中")}
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-sm text-rose-600">{error}</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                {tr("아직 알림이 없습니다.", "通知はまだありません。")}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-white/10">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={getNotificationHref(item)}
                    onClick={() => {
                      markRead(item);
                      setOpen(false);
                    }}
                    className={cn(
                      "block px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-white/5",
                      !item.isRead && "bg-rose-50/50 dark:bg-rose-500/10",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          item.isRead ? "bg-zinc-300 dark:bg-zinc-700" : "bg-rose-600",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                            {getTypeLabel(item.type)}
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                          {item.body}
                        </div>
                        {item.project?.title ? (
                          <div className="mt-2 truncate text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            {item.project.title}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
