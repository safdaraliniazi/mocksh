-- Improved profile creation function with better error handling
create or replace function public.handle_new_user()
returns trigger 
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Insert profile with better error handling
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, now())
  on conflict (id) do nothing;
  
  return new;
exception
  when others then
    -- Log error but don't fail the user creation
    raise warning 'Error creating profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- Recreate the trigger to use the updated function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Add index for faster profile lookups
create index if not exists profiles_email_idx on public.profiles(email);

-- Ensure all existing users have profiles (run this periodically if needed)
insert into public.profiles (id, email, created_at)
select 
  au.id,
  au.email,
  au.created_at
from auth.users au
where not exists (
  select 1 from public.profiles p where p.id = au.id
)
on conflict (id) do nothing;
