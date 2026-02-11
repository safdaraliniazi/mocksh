-- Manual fix: Insert profiles for existing users who don't have a profile entry

-- Insert profiles for all existing auth users who don't have a profile
insert into public.profiles (id, email)
select 
  au.id,
  au.email
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;
