"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { client } from "@/lib/api/client";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

export default function HelpButton() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (pathname === "/chat" || isLoading || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    let fetching = false;

    const loadUnreadCount = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await client.get("/chat/unread-count/");
        if (
          !result ||
          typeof result !== "object" ||
          !("unread_count" in result) ||
          typeof result.unread_count !== "number"
        ) {
          throw new Error("The support unread count response was invalid.");
        }
        if (active) setUnreadCount(result.unread_count);
      } catch (error) {
        if (active) {
          console.error("Unable to load unread support messages:", error);
        }
      } finally {
        fetching = false;
      }
    };

    void loadUnreadCount();
    const poll = window.setInterval(() => void loadUnreadCount(), 5000);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [isAuthenticated, isLoading, pathname]);

  if (pathname === "/chat") return null;

  return (
    <Link
      href="/chat"
      aria-label={
        unreadCount > 0
          ? `Get help from Wild Wash, ${unreadCount} unread messages`
          : "Get help from Wild Wash"
      }
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-[calc(env(safe-area-inset-right,0px)+16px)] z-[9999] flex items-center gap-3 rounded-full bg-red-700 px-3 py-2 shadow-lg transition-transform hover:brightness-95 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 md:bottom-[calc(env(safe-area-inset-bottom,0px)+16px)]"
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-red-700"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </span>
      <span className="hidden select-none text-sm font-semibold text-white sm:inline-block">
        Need help?
      </span>
    </Link>
  );
}
