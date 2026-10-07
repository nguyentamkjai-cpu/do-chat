import { createServerFn } from "@tanstack/react-start";

type Turn = { role: "user" | "assistant"; content: string };

function cleanMessages(input: unknown): Turn[] {
  if (!input || typeof input !== "object" || !("messages" in input)) {
    throw new Error("Thiếu nội dung.");
  }
  const raw = (input as { messages: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 16) {
    throw new Error("Hội thoại không hợp lệ.");
  }
  return raw.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Tin nhắn không hợp lệ.");
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      throw new Error("Tin nhắn không hợp lệ.");
    }
    const trimmed = content.trim().slice(0, 4000);
    if (!trimmed) throw new Error("Tin nhắn trống.");
    return { role, content: trimmed };
  });
}

export const sendMessage = createServerFn({ method: "POST" })
  .validator(cleanMessages)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Trợ lý chưa sẵn sàng trong môi trường này." };
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content:
              "Bạn là Đỏ, trợ lý hội thoại. Trả lời ngắn, rõ, bằng tiếng Việt trừ khi người dùng viết ngôn ngữ khác. Không bịa nguồn. Nếu không chắc, nói thẳng.",
          },
          ...data,
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false as const, error: "Không nhận được câu trả lời. Thử lại." };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "Câu trả lời trống." };
    return { ok: true as const, text };
  });
