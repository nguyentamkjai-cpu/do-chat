import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { cleanSite, defaultSite, type SiteSettings } from "@/lib/site";

type Row = {
  name: string;
  kicker: string;
  lead: string;
  suggestions: string;
  system_prompt: string;
};

function fromRow(row: Row | undefined): SiteSettings {
  if (!row) return defaultSite;
  let suggestions: string[] = [];
  try {
    const parsed = JSON.parse(row.suggestions) as unknown;
    if (Array.isArray(parsed)) suggestions = parsed.map((item) => String(item));
  } catch {
    suggestions = [];
  }
  return cleanSite({
    name: row.name,
    kicker: row.kicker,
    lead: row.lead,
    suggestions,
    systemPrompt: row.system_prompt,
  });
}

export async function readSite(): Promise<SiteSettings> {
  try {
    const sql = await getSql();
    const rows = await sql<Row>`select name, kicker, lead, suggestions, system_prompt from site_settings where id = 1`;
    return fromRow(rows[0]);
  } catch {
    return defaultSite;
  }
}

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => readSite());

export const adminState = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const admins = await sql<{ user_id: string }>`select user_id from site_admins`;
    const isAdmin = admins.some((row) => row.user_id === context.userId);
    return { isAdmin, openSeat: admins.length === 0 };
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const inserted = await sql<{ user_id: string }>`
      insert into site_admins (user_id)
      select ${context.userId}
      where not exists (select 1 from site_admins)
      returning user_id
    `;
    return { ok: inserted.length > 0 };
  });

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(cleanSite)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const admins = await sql<{ user_id: string }>`select user_id from site_admins where user_id = ${context.userId}`;
    if (!admins.length) return { ok: false as const, error: "Chỉ quản trị viên mới sửa được trang." };
    await sql`
      update site_settings
      set name = ${data.name},
          kicker = ${data.kicker},
          lead = ${data.lead},
          suggestions = ${JSON.stringify(data.suggestions)},
          system_prompt = ${data.systemPrompt}
      where id = 1
    `;
    return { ok: true as const };
  });
