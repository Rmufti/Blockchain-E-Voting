begin;

insert into roles (role_key, description)
values
  ('system_admin', 'full infrastructure control'),
  ('election_admin', 'can create and manage elections'),
  ('registrar_admin', 'can onboard and manage identities'),
  ('voter', 'can vote in eligible elections'),
  ('group_member', 'restricted group participant')
on conflict (role_key) do nothing;

insert into users (student_number, email, full_name, faculty, year_of_study, enrollment_status)
values
  ('A000000001', 'admin@uwo.ca', 'uwo election admin', 'administration', 4, 'active'),
  ('A000000002', 'voter1@uwo.ca', 'uwo voter one', 'science', 2, 'active')
on conflict (student_number) do nothing;

insert into user_roles (user_id, role_id)
select u.user_id, r.role_id
from users u
join roles r on r.role_key = 'election_admin'
where u.email = 'admin@uwo.ca'
on conflict do nothing;

insert into user_roles (user_id, role_id)
select u.user_id, r.role_id
from users u
join roles r on r.role_key = 'voter'
where u.email = 'voter1@uwo.ca'
on conflict do nothing;

insert into elections (title, starts_at, ends_at, group_restriction, status, created_by)
select
  'usc presidential election',
  now() - interval '1 day',
  now() + interval '7 days',
  null,
  'open',
  u.user_id
from users u
where u.email = 'admin@uwo.ca';

insert into candidates (display_name)
values ('candidate a'), ('candidate b');

insert into election_candidates (election_id, candidate_id)
select e.election_id, c.candidate_id
from elections e, candidates c
where e.title = 'usc presidential election'
on conflict do nothing;

commit;
