-- 001_init.sql
-- minimum schema for database scope (roles, elections, cached ballots, audit)

begin;

create extension if not exists "pgcrypto";

create table if not exists users (
  user_id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  email text not null unique,
  full_name text not null,
  faculty text,
  year_of_study int,
  enrollment_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  role_id serial primary key,
  role_key text not null unique,
  description text
);

create table if not exists user_roles (
  user_id uuid not null references users(user_id) on delete cascade,
  role_id int not null references roles(role_id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists elections (
  election_id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  group_restriction text,
  status text not null default 'draft',
  created_by uuid references users(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists candidates (
  candidate_id uuid primary key default gen_random_uuid(),
  display_name text not null,
  candidate_user_id uuid references users(user_id),
  created_at timestamptz not null default now()
);

create table if not exists election_candidates (
  election_id uuid not null references elections(election_id) on delete cascade,
  candidate_id uuid not null references candidates(candidate_id) on delete cascade,
  primary key (election_id, candidate_id)
);

create table if not exists ballots (
  ballot_id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(election_id) on delete cascade,
  user_id uuid not null references users(user_id) on delete cascade,
  ranking_json jsonb not null,
  blockchain_tx_id text not null,
  submitted_at timestamptz not null default now(),
  unique (election_id, user_id)
);

create table if not exists audit_log (
  audit_id bigserial primary key,
  actor_user_id uuid references users(user_id),
  action_type text not null,
  action_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_full_name on users (full_name);
create index if not exists idx_users_student_number on users (student_number);
create index if not exists idx_users_email on users (email);

create index if not exists idx_user_roles_role_id on user_roles (role_id);
create index if not exists idx_user_roles_user_id on user_roles (user_id);

create index if not exists idx_elections_status on elections (status);
create index if not exists idx_elections_time on elections (starts_at, ends_at);

create index if not exists idx_ballots_election_id on ballots (election_id);
create index if not exists idx_ballots_user_id on ballots (user_id);
create index if not exists idx_ballots_tx_id on ballots (blockchain_tx_id);

commit;
