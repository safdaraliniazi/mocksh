-- Create test_results table
create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  test_name text not null,
  score integer not null,
  total_questions integer not null,
  percentage numeric(5,2) generated always as ((score::numeric / total_questions::numeric) * 100) stored,
  time_taken_seconds integer not null,
  answers jsonb not null,
  questions jsonb not null,
  created_at timestamptz default timezone('utc', now()),
  
  constraint valid_score check (score >= 0 and score <= total_questions),
  constraint valid_time check (time_taken_seconds > 0)
);

-- Create index for faster queries
create index if not exists test_results_user_id_idx on public.test_results (user_id);
create index if not exists test_results_created_at_idx on public.test_results (created_at desc);
create index if not exists test_results_score_idx on public.test_results (score desc);

-- Enable row level security
alter table public.test_results enable row level security;

-- Users can view their own test results
create policy "Users can view their own test results"
  on public.test_results for select
  using (auth.uid() = user_id);

-- Users can insert their own test results
create policy "Users can insert their own test results"
  on public.test_results for insert
  with check (auth.uid() = user_id);

-- Create a view for leaderboard (public read access)
create or replace view public.leaderboard as
select 
  tr.user_id,
  au.email,
  tr.test_name,
  tr.score,
  tr.total_questions,
  tr.percentage,
  tr.time_taken_seconds,
  tr.created_at,
  row_number() over (partition by tr.test_name order by tr.score desc, tr.time_taken_seconds asc, tr.created_at asc) as rank
from public.test_results tr
left join auth.users au on au.id = tr.user_id
order by tr.test_name, rank;

-- Allow all authenticated users to view the leaderboard
alter table public.leaderboard owner to postgres;
grant select on public.leaderboard to authenticated;

-- Create a view for user statistics
create or replace view public.user_stats as
select 
  user_id,
  count(*) as total_tests,
  avg(score::numeric / total_questions::numeric * 100) as avg_percentage,
  max(score::numeric / total_questions::numeric * 100) as best_percentage,
  min(score::numeric / total_questions::numeric * 100) as worst_percentage,
  sum(total_questions) as total_questions_attempted,
  sum(score) as total_correct_answers
from public.test_results
group by user_id;

-- Allow users to view their own stats
grant select on public.user_stats to authenticated;
