import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Menu, Paperclip, Plus, Settings, User, X } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { sendMessage } from "@/lib/chat.functions";
import { defaultSite, type SiteSettings } from "@/lib/site";
import { getSiteSettings } from "@/lib/site.functions";

export const Route = createFileRoute("/")({ component: Home });

type Turn = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Turn[]; updatedAt?: number };

const STORE = "do-chat-v1";

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function brandTitle(name: string) {
  const trimmed = name.trim() || "Đỏ";
  return /ai$/i.test(trimmed) ? trimmed : `${trimmed} AI`;
}

function threadGroups(threads: Thread[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const buckets = [
    { label: "Hôm nay", items: [] as Thread[] },
    { label: "Hôm qua", items: [] as Thread[] },
    { label: "Trước đó", items: [] as Thread[] },
  ];
  const sorted = [...threads].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  for (const thread of sorted) {
    const ts = thread.updatedAt ?? 0;
    if (ts >= today) buckets[0].items.push(thread);
    else if (ts >= yesterday) buckets[1].items.push(thread);
    else buckets[2].items.push(thread);
  }
  return buckets.filter((bucket) => bucket.items.length > 0);
}

function Home() {
  const [entered, setEntered] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [site, setSite] = useState<SiteSettings>(defaultSite);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const user = useCurrentUser();

  useEffect(() => {
    const saved = loadThreads();
    setThreads(saved);
    setActiveId(saved[0]?.id ?? null);
  }, []);

  useEffect(() => {
    getSiteSettings().then(setSite).catch(() => setSite(defaultSite));
  }, []);

  useEffect(() => {
    if (threads.length) localStorage.setItem(STORE, JSON.stringify(threads));
  }, [threads]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [active?.messages.length, busy]);

  function openChat() {
    setEntered(true);
    if (!activeId) startThread();
  }

  function startThread() {
    const next: Thread = {
      id: crypto.randomUUID(),
      title: "Cuộc trò chuyện mới",
      messages: [],
      updatedAt: Date.now(),
    };
    setThreads((prev) => [next, ...prev]);
    setActiveId(next.id);
    setError("");
    setDrawer(false);
  }

  async function ask(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    let thread = threads.find((t) => t.id === activeId);
    if (!thread) {
      thread = {
        id: crypto.randomUUID(),
        title: content.slice(0, 42),
        messages: [],
        updatedAt: Date.now(),
      };
      setThreads((prev) => [thread!, ...prev]);
      setActiveId(thread.id);
    }
    const id = thread.id;
    const history = [
      ...thread.messages,
      { role: "user" as const, content },
    ].slice(-12);
    setDraft("");
    setError("");
    setBusy(true);
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              title: t.messages.length === 0 ? content.slice(0, 42) : t.title,
              messages: [...t.messages, { role: "user", content }],
              updatedAt: Date.now(),
            }
          : t,
      ),
    );
    try {
      const result = await sendMessage({ data: { messages: history } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, messages: [...t.messages, { role: "assistant", content: result.text }], updatedAt: Date.now() }
            : t,
        ),
      );
    } catch {
      setError("Không trả lời được. Thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function attach(file: File) {
    if (file.size > 200_000) {
      setError("File quá lớn.");
      return;
    }
    const text = await file.text();
    if (text.includes("\u0000")) {
      setError("Chỉ đính kèm file chữ.");
      return;
    }
    const clip = text.trim().slice(0, 3500);
    if (!clip) {
      setError("File trống.");
      return;
    }
    setError("");
    setDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${clip}` : clip));
  }

  if (!entered) {
    return (
      <main className="relative flex min-h-full flex-col overflow-hidden">
        <img
          src="/hero.jpg"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_center] md:object-[68%_center]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.42)_48%,rgba(0,0,0,0.78)_100%)]" />
        <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
          <Brand name={site.name} />
          <Link
            to="/admin"
            className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-fg backdrop-blur-sm"
          >
            Quản trị
          </Link>
        </header>
        <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-primary drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {site.kicker}
          </p>
          <h1 className="font-display text-7xl font-semibold leading-none tracking-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.85)] sm:text-8xl">
            {site.name}
          </h1>
          <p className="mt-5 max-w-md text-base text-fg/90 drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)]">
            {site.lead}
          </p>
          <button
            type="button"
            onClick={openChat}
            className="mt-8 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-fg shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          >
            Bắt đầu
          </button>
        </section>
      </main>
    );
  }

  const title = brandTitle(site.name);
  const groups = threadGroups(threads);

  return (
    <main className="flex h-dvh min-h-0 flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-lg md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Mở menu"
          >
            <Menu size={18} />
          </button>
          <Brand name={title} />
        </div>
        <div className="flex items-center">
          <Link to="/admin" aria-label="Cài đặt" className="grid size-11 place-items-center rounded-lg text-muted">
            <Settings size={18} />
          </Link>
          <Link
            to={user ? "/admin" : "/login"}
            aria-label={user?.displayName || "Tài khoản"}
            className="grid size-11 place-items-center rounded-lg text-muted"
          >
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <User size={18} />
            )}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${drawer ? "flex" : "hidden"} fixed inset-y-0 left-0 z-20 w-72 flex-col border-r border-border bg-surface p-3 pt-4 md:static md:flex md:w-64`}
        >
          <div className="mb-3 flex items-center justify-between md:hidden">
            <Brand name={title} />
            <button
              type="button"
              className="grid size-11 place-items-center rounded-lg text-muted"
              onClick={() => setDrawer(false)}
              aria-label="Đóng menu"
            >
              <X size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={startThread}
            className="mb-4 flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-fg"
          >
            <Plus size={16} />
            Chat mới
          </button>
          <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted">{group.label}</p>
                <div className="flex flex-col">
                  {group.items.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveId(t.id);
                        setDrawer(false);
                      }}
                      className={`truncate rounded-xl px-3 py-2.5 text-left text-sm ${t.id === activeId ? "bg-surface-2 text-fg" : "text-muted"}`}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <Link
            to="/admin"
            className="mt-2 flex h-11 items-center gap-2 rounded-xl px-3 text-sm text-muted"
          >
            <Settings size={16} />
            Cài đặt
          </Link>
        </aside>
        {drawer ? (
          <button
            type="button"
            aria-label="Đóng lớp phủ"
            className="fixed inset-0 z-10 bg-bg/70 md:hidden"
            onClick={() => setDrawer(false)}
          />
        ) : null}

        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-4 py-6">
            <div className="mx-auto flex h-full max-w-2xl flex-col gap-4">
              {!active || active.messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <p className="font-display text-4xl font-semibold tracking-tight">{title}</p>
                  <p className="mt-3 text-muted">Bạn muốn hỏi gì?</p>
                  <div className="mt-8 flex w-full max-w-md flex-col gap-2">
                    {site.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => ask(s)}
                        className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm text-fg"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                active.messages.map((m, i) => (
                  <article key={`${m.role}-${i}`} className="flex gap-3">
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${m.role === "user" ? "bg-surface-2 text-fg" : "bg-primary text-primary-fg"}`}
                    >
                      {m.role === "user" ? "B" : "Đ"}
                    </div>
                    <p className="min-w-0 flex-1 whitespace-pre-wrap rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
                      {m.content}
                    </p>
                  </article>
                ))
              )}
              {busy ? <p className="text-sm text-muted">Đang trả lời…</p> : null}
              {error ? <p className="text-sm text-primary">{error}</p> : null}
            </div>
          </div>

          <form
            className="px-4 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
          >
            <div className="mx-auto flex max-w-2xl items-end gap-1 rounded-2xl border border-border bg-surface p-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void attach(file);
                }}
              />
              <button
                type="button"
                aria-label="Đính kèm"
                className="grid size-11 shrink-0 place-items-center rounded-xl text-muted"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip size={18} />
              </button>
              <textarea
                ref={box}
                value={draft}
                rows={1}
                placeholder="Nhập câu hỏi..."
                className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-fg outline-none placeholder:text-muted"
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(draft);
                  }
                }}
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                aria-label="Gửi"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg disabled:opacity-40"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Brand({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-fg">
        {name.slice(0, 1) || "Đ"}
      </span>
      {name}
    </div>
  );
}
