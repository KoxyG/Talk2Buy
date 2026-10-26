-- Talk2Buy schema: carts, chats, glossary and evals.
-- Products, shops, orders and payments stay in the host store; tools reach them through its adapter.

create extension if not exists pg_trgm;

-- Host projects that embed the widget. Server keys live in .env, not here.
create table projects (
  id              text primary key,                -- e.g. 'choppaddi'
  name            text not null,
  allowed_domains text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create table carts (
  id              uuid primary key default gen_random_uuid(),
  project_id      text not null references projects(id),
  session_id      text not null,
  items           jsonb not null default '[]',     -- [{product_id, name, quantity, price}], host IDs
  total           numeric(12, 2) not null default 0,
  items_not_found jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index carts_session_idx on carts (session_id);

create table conversations (
  session_id text primary key,
  project_id text not null references projects(id),
  messages   jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pidgin and local names, e.g. "swallow" -> "eba, pounded yam, amala".
create table pidgin_glossary (
  id               bigint generated always as identity primary key,
  term             text not null,
  meaning          text not null,
  normalized_query text,
  source           text not null check (source in ('glossary', 'web')),
  verified         boolean not null default false,
  created_at       timestamptz not null default now()
);

create unique index pidgin_glossary_term_idx on pidgin_glossary (lower(term));
-- Typo-tolerant lookup: "jolof" and "swalow" still find their terms.
create index pidgin_glossary_term_trgm_idx on pidgin_glossary using gin (lower(term) gin_trgm_ops);

create table eval_runs (
  id         bigint generated always as identity primary key,
  run_id     text not null,                        -- groups one full pass over the 50 requests
  model      text not null,
  request_id text not null,                        -- e.g. 'F02' from eval/requests.jsonl
  request    text not null,
  expected   jsonb not null,
  actual     jsonb,
  correct    boolean,
  latency_ms int,
  created_at timestamptz not null default now()
);

-- Supabase exposes the public schema through its REST API. RLS with no policies blocks that
-- route; the agent and tools connect with DATABASE_URL, which bypasses RLS.
alter table projects        enable row level security;
alter table carts           enable row level security;
alter table conversations   enable row level security;
alter table pidgin_glossary enable row level security;
alter table eval_runs       enable row level security;
