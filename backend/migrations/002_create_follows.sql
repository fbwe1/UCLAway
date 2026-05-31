create table if not exists public.follows (
  id bigserial primary key,
  follower_user_id integer not null,
  followed_user_id integer not null,
  created_at timestamptz not null default now(),
  constraint follows_no_self_follow check (follower_user_id <> followed_user_id),
  constraint follows_unique_pair unique (follower_user_id, followed_user_id)
);

create index if not exists follows_follower_user_id_idx
  on public.follows (follower_user_id);

create index if not exists follows_followed_user_id_idx
  on public.follows (followed_user_id);
