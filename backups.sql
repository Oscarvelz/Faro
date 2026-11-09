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

-- ============================================================================
-- faro_push SIN RELOJ DE PARED (oleada 2 del corazón, 1.3.166) — PREPARADO,
-- PENDIENTE DE APLICAR en el editor SQL de Supabase (la definición viva de
-- faro_push no vive en este repo). Antes, a igual revisión decidía p_updated:
-- un reloj adelantado podía reemplazar el libro en silencio (auditoría del
-- corazón, C7/W5). Ahora gana solo una revisión MAYOR; a igual revisión solo
-- pasa el re-empuje idéntico (mismo contenido, comparado como jsonb) y
-- cualquier otro contenido se rechaza: el cliente lo recupera como conflicto.
-- La firma y la forma de retorno (data_json, revision, updated_at, device_id,
-- won) no cambian; el cliente no necesita tocarse.
-- ============================================================================
create or replace function public.faro_push(p_data text, p_revision integer, p_updated timestamptz, p_device text)
returns table (data_json text, revision integer, updated_at timestamptz, device_id text, won boolean)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prev_rev integer;
  prev_json text;
  did_win boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select l.revision, l.data_json::text into prev_rev, prev_json
    from public.faro_ledgers l where l.user_id = uid;
  did_win := prev_rev is null
    or p_revision > prev_rev
    or (p_revision = prev_rev and prev_json::jsonb = p_data::jsonb);
  if did_win then
    insert into public.faro_ledgers (user_id, data_json, revision, updated_at, device_id)
    values (uid, p_data::jsonb, p_revision, p_updated, p_device)
    on conflict (user_id) do update set
      data_json = excluded.data_json,
      revision = excluded.revision,
      updated_at = excluded.updated_at,
      device_id = excluded.device_id
    where public.faro_ledgers.revision < excluded.revision;
  end if;
  return query
    select l.data_json::text, l.revision, l.updated_at, l.device_id, did_win
    from public.faro_ledgers l where l.user_id = uid;
end $$;
revoke all on function public.faro_push(text, integer, timestamptz, text) from public, anon;
grant execute on function public.faro_push(text, integer, timestamptz, text) to authenticated;
