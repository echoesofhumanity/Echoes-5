-- Echoes Response Center — isolated staging schema draft
-- DESIGN ARTIFACT ONLY. Do not deploy to production.
-- No public API access, no live intake, no real person data.
begin;
create schema if not exists response_private;
revoke all on schema response_private from public, anon, authenticated;
create type response_private.case_pathway as enum ('alert_personal_safety','alert_humanitarian','missing');
create type response_private.case_status as enum ('submitted','human_triage','verified','declined','referred','coordinated','follow_up','closed');
create table response_private.cases (
  id uuid primary key default gen_random_uuid(),
  pathway response_private.case_pathway not null,
  status response_private.case_status not null default 'submitted',
  jurisdiction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table response_private.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references response_private.cases(id),
  event_type text not null,
  recorded_at timestamptz not null default now()
);
alter table response_private.cases enable row level security;
alter table response_private.cases force row level security;
alter table response_private.case_events enable row level security;
alter table response_private.case_events force row level security;
revoke all on all tables in schema response_private from public, anon, authenticated;
revoke all on all sequences in schema response_private from public, anon, authenticated;
-- No client-facing policies, grants, exposed endpoints, storage buckets or service keys.
-- Access remains denied to ordinary client roles until a reviewed server-only gateway exists.
commit;
