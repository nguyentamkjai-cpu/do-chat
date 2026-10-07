import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = { email: email.trim(), password, callbackURL: "/admin" };
    const result =
      mode === "up"
        ? await authClient.signUp.email({ ...payload, name: email.trim().split("@")[0] || "Admin" })
        : await authClient.signIn.email(payload);
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Không đăng nhập được.");
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <main className="grid min-h-full place-items-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl">Quản trị</h1>
        <p className="mt-2 text-sm text-muted">Đăng nhập để sửa trang. Tài khoản đầu tiên sẽ là admin.</p>
        {authEnabled ? (
          <>
            <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu, ít nhất 8 ký tự"
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none"
              />
              {error ? <p className="text-sm text-primary">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="h-11 rounded-xl bg-primary font-semibold text-primary-fg disabled:opacity-40"
              >
                {mode === "up" ? "Tạo tài khoản" : "Đăng nhập"}
              </button>
              <button
                type="button"
                className="text-sm text-muted"
                onClick={() => setMode(mode === "up" ? "in" : "up")}
              >
                {mode === "up" ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Tạo mới"}
              </button>
            </form>
            <div className="mt-6 flex flex-col gap-2">
              {GROK_PROVIDERS.map((provider) => (
                <button
                  key={provider.providerId}
                  type="button"
                  onClick={() => signIn(provider.providerId, { callbackURL: "/admin" })}
                  className="h-11 rounded-xl border border-border text-sm font-semibold text-fg"
                >
                  Tiếp tục với {provider.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">Đăng nhập đang tắt.</p>
        )}
      </div>
    </main>
  );
}
