-- ============================================================================
-- EL LIBRO COMPARTIDO — Pieza C1 (1.3.390): LA MEMBRESÍA EN EL SERVIDOR.
-- Este archivo es la fuente en papel: se pega TAL CUAL en el editor SQL de
-- Supabase, como backups.sql y delete-account.sql. Hasta que se pegue, la
-- costura del cliente (src/spa/cloud.ts) degrada con gracia: cada función
-- devuelve null/false y ninguna superficie finge que el libro se comparte.
--
-- Los fallos que esta pieza sirve (BRIEF-LIBRO-COMPARTIDO.md):
-- · F-C1: un solo libro; cada membresía tiene un ALCANCE (el libro entero
--   o estas categorías — la columna scope lo guarda desde ya; su
--   cumplimiento en el servidor es la Pieza C2) y un PAPEL (anota / solo
--   mira).
-- · La invitación va al correo de la cuenta y EL ENLACE NO ES LLAVE: sin
--   entrar con esa cuenta no abre nada — faro_accept exige que el correo
--   de la sesión sea el invitado.
-- · Vencimiento de 30 días, declarado en ambos extremos (expires_at viaja
--   en la fila y la aceptación lo comprueba).
-- · Tope del estudio, fallado: hasta 10 PERSONAS en total en el libro —
--   el dueño y nueve membresías (pendientes + activas).
-- · F-C4: la propiedad se transfiere a un miembro QUE ANOTA y QUE ACEPTA
--   sabiendo lo que recibe: la oferta (faro_offer_transfer) no mueve nada
--   hasta que el miembro la acepta (faro_accept_transfer). Al pasar la
--   batuta, el dueño anterior queda como miembro que anota con alcance
--   entero — no pierde su lugar de golpe; salir es su ceremonia (C8).
--
-- Toda escritura pasa por RPC con security definer: la tabla no concede
-- insert/update/delete directos a nadie. La lectura sí tiene policy: el
-- dueño y el miembro leen sus propias filas (la actividad y las firmas
-- son consultables y simétricas — cerca 4 del brief).
-- ============================================================================

create table if not exists public.faro_memberships (
  id          uuid not null default gen_random_uuid(),
  book_owner  uuid not null references auth.users(id) on delete cascade,
  member      uuid references auth.users(id) on delete cascade,
  email       text not null,
  scope       jsonb not null default '{"all": true}'::jsonb,
  role        text not null default 'note' check (role in ('note', 'view')),
  status      text not null default 'pending' check (status in ('pending', 'active')),
  transfer_to uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  accepted_at timestamptz,
  primary key (id)
);
create index if not exists faro_memberships_owner_idx on public.faro_memberships (book_owner);
create index if not exists faro_memberships_member_idx on public.faro_memberships (member);
create unique index if not exists faro_memberships_book_email_idx
  on public.faro_memberships (book_owner, email) where status = 'pending';

alter table public.faro_memberships enable row level security;
drop policy if exists "memberships read own" on public.faro_memberships;
create policy "memberships read own" on public.faro_memberships
  for select to authenticated
  using (book_owner = auth.uid() or member = auth.uid());

-- ── Invitar ────────────────────────────────────────────────────────────────
create or replace function public.faro_invite(p_email text, p_scope jsonb, p_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text := lower(trim(p_email));
  own_mail text;
  n integer;
  new_id uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if mail = '' or mail not like '%@%' then raise exception 'invalid email'; end if;
  if p_role not in ('note', 'view') then raise exception 'invalid role'; end if;
  select email into own_mail from auth.users where id = uid;
  if mail = lower(own_mail) then raise exception 'cannot invite yourself'; end if;
  -- El tope: 10 personas en total (el dueño + 9 membresías vivas).
  select count(*) into n from faro_memberships
    where book_owner = uid and (status = 'active' or expires_at > now());
  if n >= 9 then raise exception 'book is full (10 people)'; end if;
  -- Una invitación viva por correo y libro: la vieja vencida se retira.
  delete from faro_memberships
    where book_owner = uid and email = mail and status = 'pending' and expires_at <= now();
  if exists (select 1 from faro_memberships where book_owner = uid and email = mail and status = 'pending') then
    raise exception 'already invited';
  end if;
  if exists (select 1 from faro_memberships m join auth.users u on u.id = m.member
             where m.book_owner = uid and m.status = 'active' and lower(u.email) = mail) then
    raise exception 'already a member';
  end if;
  insert into faro_memberships (book_owner, email, scope, role)
  values (uid, mail, coalesce(p_scope, '{"all": true}'::jsonb), p_role)
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.faro_invite(text, jsonb, text) from public, anon;
grant execute on function public.faro_invite(text, jsonb, text) to authenticated;

-- ── Aceptar (el enlace no es llave: la sesión ES el correo invitado) ──────
create or replace function public.faro_accept(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  my_mail text;
  row_m faro_memberships%rowtype;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into row_m from faro_memberships where id = p_id;
  if row_m.id is null or row_m.status <> 'pending' then return false; end if;
  if row_m.expires_at <= now() then return false; end if;
  select email into my_mail from auth.users where id = uid;
  if lower(my_mail) <> row_m.email then return false; end if;
  update faro_memberships
    set member = uid, status = 'active', accepted_at = now()
    where id = p_id;
  return true;
end $$;
revoke all on function public.faro_accept(uuid) from public, anon;
grant execute on function public.faro_accept(uuid) to authenticated;

-- ── Cancelar una invitación pendiente (el dueño) ───────────────────────────
create or replace function public.faro_cancel_invite(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from faro_memberships where id = p_id and book_owner = uid and status = 'pending';
  return found;
end $$;
revoke all on function public.faro_cancel_invite(uuid) from public, anon;
grant execute on function public.faro_cancel_invite(uuid) to authenticated;

-- ── Salir (el miembro, de una membresía activa) ────────────────────────────
create or replace function public.faro_leave(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from faro_memberships where id = p_id and member = uid and status = 'active';
  return found;
end $$;
revoke all on function public.faro_leave(uuid) from public, anon;
grant execute on function public.faro_leave(uuid) to authenticated;

-- ── Remover (el dueño, a un miembro activo) ────────────────────────────────
create or replace function public.faro_remove(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from faro_memberships where id = p_id and book_owner = uid and status = 'active';
  return found;
end $$;
revoke all on function public.faro_remove(uuid) from public, anon;
grant execute on function public.faro_remove(uuid) to authenticated;

-- ── Transferir: la oferta (no mueve nada hasta que el miembro acepta) ─────
create or replace function public.faro_offer_transfer(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  -- Solo a un miembro activo QUE ANOTA (F-C4): quien solo mira no recibe
  -- la batuta.
  update faro_memberships
    set transfer_to = member
    where id = p_id and book_owner = uid and status = 'active' and role = 'note' and member is not null;
  return found;
end $$;
revoke all on function public.faro_offer_transfer(uuid) from public, anon;
grant execute on function public.faro_offer_transfer(uuid) to authenticated;

-- ── Transferir: la aceptación (sabiendo lo que recibe) ────────────────────
create or replace function public.faro_accept_transfer(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  row_m faro_memberships%rowtype;
  old_owner uuid;
  old_mail text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into row_m from faro_memberships where id = p_id;
  if row_m.id is null or row_m.status <> 'active' or row_m.transfer_to is distinct from uid then
    return false;
  end if;
  old_owner := row_m.book_owner;
  select email into old_mail from auth.users where id = old_owner;
  -- Todas las membresías del libro cambian de dueño…
  update faro_memberships set book_owner = uid where book_owner = old_owner;
  -- …la fila del nuevo dueño desaparece (ya es el dueño)…
  delete from faro_memberships where id = p_id;
  -- …y el dueño anterior queda como miembro que anota, alcance entero.
  insert into faro_memberships (book_owner, member, email, scope, role, status, accepted_at)
  values (uid, old_owner, lower(old_mail), '{"all": true}'::jsonb, 'note', 'active', now());
  return true;
end $$;
revoke all on function public.faro_accept_transfer(uuid) from public, anon;
grant execute on function public.faro_accept_transfer(uuid) to authenticated;
