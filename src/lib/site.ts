export type SiteSettings = {
  name: string;
  kicker: string;
  lead: string;
  suggestions: string[];
  systemPrompt: string;
};

export const defaultSite: SiteSettings = {
  name: "Đỏ",
  kicker: "TRỢ LÝ HỘI THOẠI",
  lead: "Khung chat tối, một nút đỏ. Mở là nhắn được — hội thoại nằm trên trình duyệt này.",
  suggestions: [
    "Giải thích RAG trong năm dòng.",
    "Viết hàm Python đảo chuỗi, có type hint.",
    "Tóm tắt cách một web chat hoạt động.",
  ],
  systemPrompt:
    "Bạn là Đỏ, trợ lý hội thoại. Trả lời ngắn, rõ, bằng tiếng Việt trừ khi người dùng viết ngôn ngữ khác. Không bịa nguồn. Nếu không chắc, nói thẳng.",
};

export function cleanSite(input: unknown): SiteSettings {
  const raw = input && typeof input === "object" ? (input as Partial<SiteSettings>) : {};
  const name = String(raw.name ?? "").trim().slice(0, 40) || defaultSite.name;
  const kicker = String(raw.kicker ?? "").trim().slice(0, 48) || defaultSite.kicker;
  const lead = String(raw.lead ?? "").trim().slice(0, 280) || defaultSite.lead;
  const systemPrompt = String(raw.systemPrompt ?? "").trim().slice(0, 2000) || defaultSite.systemPrompt;
  const suggestions = Array.isArray(raw.suggestions)
    ? raw.suggestions.map((item) => String(item).trim().slice(0, 120)).filter(Boolean).slice(0, 4)
    : [];
  return {
    name,
    kicker,
    lead,
    suggestions: suggestions.length ? suggestions : defaultSite.suggestions,
    systemPrompt,
  };
}
