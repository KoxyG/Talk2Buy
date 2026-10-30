-- Day 7: thumbs up/down on assistant replies from real testers. The reply and the customer
-- message before it are copied in, so a row makes sense without replaying the conversation.

create table feedback (
  id         bigint generated always as identity primary key,
  session_id text not null references conversations(session_id),
  project_id text not null references projects(id),
  rating     text not null check (rating in ('up', 'down')),
  comment    text,
  reply      text not null,
  question   text,
  model      text,
  created_at timestamptz not null default now()
);

create index feedback_session_idx on feedback (session_id);
