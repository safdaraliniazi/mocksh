-- Add RLS policy to allow all authenticated users to read profiles for leaderboard
create policy "All users can view profiles for leaderboard"
  on public.profiles for select
  to authenticated
  using (true);

-- Update leaderboard view to join with profiles table instead of auth.users
create or replace view public.leaderboard as
select 
  tr.user_id,
  coalesce(p.full_name, p.email, au.email) as email,
  p.full_name,
  tr.test_name,
  tr.score,
  tr.total_questions,
  tr.percentage,
  tr.time_taken_seconds,
  tr.created_at,
  row_number() over (partition by tr.test_name order by tr.score desc, tr.time_taken_seconds asc, tr.created_at asc) as rank
from public.test_results tr
left join auth.users au on au.id = tr.user_id
left join public.profiles p on p.id = tr.user_id
order by tr.test_name, rank;

-- Ensure profiles exist for all auth users (backfill)
insert into public.profiles (id, email)
select 
  au.id,
  au.email
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;
