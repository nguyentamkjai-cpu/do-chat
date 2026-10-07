import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Menu, Plus, X } from "lucide-react";
import { sendMessage } from "@/lib/chat.functions";

export const Route = createFileRoute("/")({ component: Home });

type Turn = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Turn[] };

const STORE = "do-chat-v1";
const SUGGESTIONS = [
  "Giải thích RAG trong năm dòng.",
  "Viết hàm Python đảo chuỗi, có type hint.",
  "Tóm tắt cách một web chat hoạt động.",
];

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

function Home() {
  const [entered, setEntered] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = loadThreads();
    setThreads(saved);
    setActiveId(saved[0]?.id ?? null);
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
      thread = { id: crypto.randomUUID(), title: content.slice(0, 42), messages: [] };
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
            ? { ...t, messages: [...t.messages, { role: "assistant", content: result.text }] }
            : t,
        ),
      );
    } catch {
      setError("Không trả lời được. Thử lại.");
    } finally {
      setBusy(false);
    }
  }

  if (!entered) {
    return (
      <main className="flex min-h-full flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <Brand />
          <button
            type="button"
            onClick={openChat}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-fg"
          >
            Vào chat
          </button>
        </header>
        <section className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-primary">
            TRỢ LÝ HỘI THOẠI
          </p>
          <h1 className="font-display text-7xl font-semibold leading-none tracking-tight sm:text-8xl">
            Đỏ
          </h1>
          <p className="mt-5 max-w-md text-base text-muted">
            Khung chat tối, một nút đỏ. Mở là nhắn được — hội thoại nằm trên trình duyệt này.
          </p>
          <button
            type="button"
            onClick={openChat}
            className="mt-8 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-fg"
          >
            Bắt đầu
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-dvh min-h-0">
      <aside
        className={`${drawer ? "flex" : "hidden"} fixed inset-y-0 left-0 z-20 w-72 flex-col border-r border-border bg-surface p-4 md:static md:flex`}
      >
        <div className="mb-4 flex items-center justify-between">
          <Brand />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-lg text-muted md:hidden"
            onClick={() => setDrawer(false)}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={startThread}
          className="mb-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-fg"
        >
          <Plus size={16} />
          Cuộc mới
        </button>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveId(t.id);
                setDrawer(false);
              }}
              className={`truncate rounded-xl px-3 py-3 text-left text-sm ${t.id === activeId ? "bg-surface-2 text-fg" : "text-muted"}`}
            >
              {t.title}
            </button>
          ))}
        </nav>
        <p className="border-t border-border pt-3 text-xs text-muted">Lưu trên trình duyệt này.</p>
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
        <header className="flex h-14 items-center gap-2 border-b border-border px-3">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-lg md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Mở menu"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm text-muted">Grok</span>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {!active || active.messages.length === 0 ? (
              <div className="pt-16 text-center">
                <p className="font-display text-3xl">Hỏi Đỏ</p>
                <p className="mt-2 text-sm text-muted">Chọn một gợi ý hoặc gõ câu của bạn.</p>
                <div className="mt-6 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
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
          <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-border bg-surface p-2">
            <textarea
              ref={box}
              value={draft}
              rows={1}
              placeholder="Nhắn cho Đỏ…"
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
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-fg">Đ</span>
      Đỏ
    </div>
  );
}
