create table if not exists site_settings (
  id integer primary key,
  name text not null,
  kicker text not null,
  lead text not null,
  suggestions text not null,
  system_prompt text not null
);

insert into site_settings (id, name, kicker, lead, suggestions, system_prompt)
values (
  1,
  'Đỏ',
  'TRỢ LÝ HỘI THOẠI',
  'Khung chat tối, một nút đỏ. Mở là nhắn được — hội thoại nằm trên trình duyệt này.',
  '["Giải thích RAG trong năm dòng.","Viết hàm Python đảo chuỗi, có type hint.","Tóm tắt cách một web chat hoạt động."]',
  'Bạn là Đỏ, trợ lý hội thoại. Trả lời ngắn, rõ, bằng tiếng Việt trừ khi người dùng viết ngôn ngữ khác. Không bịa nguồn. Nếu không chắc, nói thẳng.'
)
on conflict (id) do nothing;

create table if not exists site_admins (
  user_id text primary key
);
