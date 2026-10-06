create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author text not null check (char_length(author) between 1 and 50),
  title text not null check (char_length(title) between 1 and 90),
  description text not null check (char_length(description) between 1 and 500),
  media_type text check (media_type in ('image', 'video')),
  media_url text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
