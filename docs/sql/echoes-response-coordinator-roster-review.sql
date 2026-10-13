-- Echoes Response / coordinator roster — REVIEW DRAFT ONLY
-- Target: independent echoes-response-staging project, private schema.
-- DO NOT execute until reviewed. Does not authorize any API, user, or case access.
-- Prerequisites: response_private schema and Supabase auth.users.
-- Approval provenance, identity proofing, MFA and immutable audit require separate
-- human-approved server workflows. A database row is not proof of verification.

create table response_private.coordinator_roster (
  user_id uuid primary key references auth.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended', 'revoked')),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coordinator_no_self_approval
    check (approved_by is null or approved_by <> user_id),
  constraint coordinator_approved_has_approver
    check (
      status <> 'approved'
      or (approved_by is not null and approved_at is not null)
    )
);

alter table response_private.coordinator_roster enable row level security;
alter table response_private.coordinator_roster force row level security;
revoke all on response_private.coordinator_roster from public, anon, authenticated;
-- Intentionally zero RLS policies and no client role grants.
-- No roster inserts or approval endpoints are implemented by this file.
-- Future server authorization must also check MFA, verified staff status,
-- jurisdiction, assignment expiry/revocation, and operation-specific scope.
-- An approved roster row alone NEVER grants case access.

-- Review notes:
-- 1. DB check constraints cannot prove human approval or MFA completion.
-- 2. Add auditable approval transitions and prevent unauthorized status updates
--    before allowing any server writer to modify this table.
-- 3. Independently review cross-schema auth.users dependency and RLS/grants.
-- 4. Run only on staging with synthetic users after explicit deployment approval.
