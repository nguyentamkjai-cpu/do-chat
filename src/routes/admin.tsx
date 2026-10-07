import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { defaultSite, type SiteSettings } from "@/lib/site";
import { adminState, claimAdmin, getSiteSettings, saveSiteSettings } from "@/lib/site.functions";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, isPending } = useCurrentUserState();
  const [settings, setSettings] = useState<SiteSettings>(defaultSite);
  const [isAdmin, setIsAdmin] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSiteSettings().then(setSettings).catch(() => setSettings(defaultSite));
  }, []);

  useEffect(() => {
    if (!user) return;
    adminState()
      .then(async (state) => {
        if (state.openSeat) {
          await claimAdmin();
          const again = await adminState();
          setIsAdmin(again.isAdmin);
          setNote(again.isAdmin ? "Bạn là quản trị viên của trang này." : "Đã có quản trị viên khác.");
          return;
        }
        setIsAdmin(state.isAdmin);
      })
      .catch(() => setNote("Không đọc được quyền."));
  }, [user]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote("");
    const result = await saveSiteSettings({ data: settings });
    setBusy(false);
    setNote(result.ok ? "Đã lưu. Trang chủ dùng nội dung mới." : result.error);
  }

  if (isPending) return <main className="p-8 text-sm text-muted">Đang kiểm tra phiên…</main>;

  if (!user) {
    return (
      <main className="grid min-h-full place-items-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-4xl">Cần đăng nhập</h1>
          <p className="mt-2 text-sm text-muted">Chỉ quản trị viên sửa được chữ trên trang và cách trợ lý trả lời.</p>
          <Link to="/login" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-fg">
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">QUẢN TRỊ</p>
          <h1 className="font-display text-4xl">{settings.name}</h1>
        </div>
        <UserButton />
      </div>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
      {isAdmin ? (
        <form className="flex flex-col gap-4" onSubmit={save}>
          <Field label="Tên trang" value={settings.name} onChange={(name) => setSettings({ ...settings, name })} />
          <Field label="Dòng nhỏ" value={settings.kicker} onChange={(kicker) => setSettings({ ...settings, kicker })} />
          <Field label="Giới thiệu" value={settings.lead} onChange={(lead) => setSettings({ ...settings, lead })} multiline />
          <Field
            label="Gợi ý, mỗi dòng một câu"
            value={settings.suggestions.join("\n")}
            onChange={(value) => setSettings({ ...settings, suggestions: value.split("\n").map((line) => line.trim()).filter(Boolean) })}
            multiline
          />
          <Field
            label="Cách trợ lý trả lời"
            value={settings.systemPrompt}
            onChange={(systemPrompt) => setSettings({ ...settings, systemPrompt })}
            multiline
          />
          <button type="submit" disabled={busy} className="h-11 rounded-xl bg-primary font-semibold text-primary-fg disabled:opacity-40">
            Lưu thay đổi
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">Tài khoản này không phải quản trị viên.</p>
      )}
      <Link to="/" className="text-sm text-muted">Về trang chủ</Link>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const className = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg outline-none";
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      {multiline ? (
        <textarea className={`${className} min-h-24`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={`${className} h-11`} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
