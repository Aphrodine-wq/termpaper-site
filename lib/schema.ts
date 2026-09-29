// The gallery's tables. POST /api/admin/migrate runs these in order; every
// statement can run again safely.

export const SCHEMA: string[] = [
  `create table if not exists themes (
    id          text primary key,
    name        text not null,
    author      text not null default '',
    description text not null default '',
    tags        text[] not null default '{}',
    theme       jsonb not null,
    code        text not null,
    token_hash  text not null,
    ip_hash     text not null,
    installs    integer not null default 0,
    likes       integer not null default 0,
    reports     integer not null default 0,
    hidden      boolean not null default false,
    created_at  timestamptz not null default now()
  )`,
  `create unique index if not exists themes_code on themes (code)`,
  `create index if not exists themes_new on themes (created_at desc) where not hidden`,
  `create index if not exists themes_popular on themes (installs desc, likes desc, created_at desc) where not hidden`,
  // one install, like or report per theme per (hashed) address
  `create table if not exists theme_events (
    theme_id   text not null references themes (id) on delete cascade,
    kind       text not null check (kind in ('install', 'like', 'report')),
    ip_hash    text not null,
    created_at timestamptz not null default now(),
    primary key (theme_id, kind, ip_hash)
  )`,
  // publishes per address, for the hourly limit (kept a day)
  `create table if not exists publishes (
    ip_hash    text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists publishes_recent on publishes (ip_hash, created_at)`,
];
