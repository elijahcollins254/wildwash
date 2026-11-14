"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowLeftIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { client } from "@/lib/api/client";
import {
  listenForSupportMessages,
  type SupportMessage,
} from "@/lib/api/supportEvents";
import type { RootState } from "@/redux/store";

export default function ChatPage() {
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    let active = true;
    const controller = new AbortController();

    const connectToChat = async () => {
      setLoadingMessages(true);
      try {
        const result = await client.get("/chat/");
        if (!Array.isArray(result)) {
          throw new Error("The support messages response was invalid.");
        }

        const initialMessages = result as SupportMessage[];
        if (!active) return;
        setMessages(initialMessages);
        setError(null);

        const lastMessageId = initialMessages.reduce(
          (latestId, message) => Math.max(latestId, message.id),
          0,
        );
        void listenForSupportMessages(
          lastMessageId,
          controller.signal,
          (message) => {
            if (!active) return;
            setMessages((current) =>
              current.some((existing) => existing.id === message.id)
                ? current
                : [...current, message],
            );
            void client
              .post("/chat/read/", { through_id: message.id })
              .catch((readError) => {
                if (active) {
                  setError(
                    readError instanceof Error
                      ? readError.message
                      : "Unable to update support message status.",
                  );
                }
              });
          },
          (streamError) => {
            if (active) {
              setError(`Live updates disconnected. Reconnecting… ${streamError.message}`);
            }
          },
          () => {
            if (active) setError(null);
          },
        );
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your support messages.",
          );
        }
      } finally {
        if (active) setLoadingMessages(false);
      }
    };

    void connectToChat();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    try {
      const message = (await client.post("/chat/", { body })) as SupportMessage;
      setMessages((current) =>
        current.some((existing) => existing.id === message.id)
          ? current
          : [...current, message],
      );
      setDraft("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-slate-500">Checking your account…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Chat with support</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Sign in to start a conversation with the Wild Wash support team.
        </p>
        <Link
          href="/login?redirect=%2Fchat"
          className="mt-6 rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
        >
          Sign in to chat
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-700 dark:text-slate-300 dark:hover:text-red-400"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
        Back to Wild Wash
      </Link>

      <div className="flex min-h-[65vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-red-700 px-5 py-4 text-white dark:border-slate-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 font-bold">
            W
          </div>
          <div>
            <h1 className="font-semibold">Wild Wash Support</h1>
            <p className="text-xs text-red-100">We’ll reply here as soon as we can</p>
          </div>
        </header>

        <div
          aria-live="polite"
          aria-label="Conversation messages"
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6"
        >
          <div className="mx-auto max-w-md rounded-xl bg-white px-4 py-3 text-center text-sm text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            Send us a message and our support team will respond in this chat.
          </div>

          {loadingMessages && (
            <p className="py-4 text-center text-sm text-slate-500">
              Loading messages…
            </p>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_from_support ? "justify-start" : "justify-end"}`}
            >
              <article
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                  message.is_from_support
                    ? "rounded-tl-sm bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    : "rounded-tr-sm bg-emerald-100 text-slate-900 dark:bg-emerald-900 dark:text-emerald-50"
                }`}
              >
                <p className="mb-1 text-xs font-semibold opacity-70">
                  {message.is_from_support ? "Wild Wash Support" : "You"}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {message.body}
                </p>
                <time
                  dateTime={message.created_at}
                  className="mt-2 block text-right text-[11px] opacity-60"
                >
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </article>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p role="alert" className="border-t border-red-100 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-300">
            {error}
          </p>
        )}

        <form
          onSubmit={sendMessage}
          className="flex items-end gap-3 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:p-4"
        >
          <label className="sr-only" htmlFor="support-message">
            Type a message
          </label>
          <textarea
            id="support-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={4000}
            rows={1}
            placeholder="Type your message…"
            className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-red-950"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-700 text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperAirplaneIcon className="h-5 w-5" aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}
