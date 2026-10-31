create table if not exists public.faro_backups (
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day        date not null,
  data_gz    text not null,
  bytes      integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.faro_backups enable row level security;
drop policy if exists "own backups read" on public.faro_backups;
create policy "own backups read" on public.faro_backups for select to authenticated using (user_id = auth.uid());

create or replace function public.faro_backup(p_day date, p_data text, p_bytes integer)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if length(p_data) > 800000 then raise exception 'too large'; end if;
  insert into faro_backups (user_id, day, data_gz, bytes, created_at)
  values (uid, p_day, p_data, greatest(p_bytes, 0), now())
  on conflict (user_id, day) do update set data_gz = excluded.data_gz, bytes = excluded.bytes, created_at = now();
  delete from faro_backups b where b.user_id = uid and b.day not in (
    select x.day from faro_backups x where x.user_id = uid order by x.day desc limit 14);
end $$;
revoke all on function public.faro_backup(date, text, integer) from public, anon;
grant execute on function public.faro_backup(date, text, integer) to authenticated;
