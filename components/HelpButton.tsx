"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export default function HelpButton() {
  const pathname = usePathname();

  if (pathname === "/chat") return null;

  return (
    <Link
      href="/chat"
      aria-label="Get help from Wild Wash"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] right-[calc(env(safe-area-inset-right,0px)+16px)] z-[9999] flex items-center gap-3 rounded-full bg-red-700 px-3 py-2 shadow-lg transition-transform hover:brightness-95 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 md:bottom-[calc(env(safe-area-inset-bottom,0px)+16px)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" aria-hidden />
      </span>
      <span className="hidden select-none text-sm font-semibold text-white sm:inline-block">
        Need help?
      </span>
    </Link>
  );
}
