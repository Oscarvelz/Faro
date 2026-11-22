-- ============================================================================
-- EL LIBRO COMPARTIDO — Pieza C3, mitad de servidor (1.3.392): EL EMPUJE
-- DEL MIEMBRO. Se pega en el editor SQL de Supabase DESPUÉS de shared.sql.
-- Hasta que se pegue, la costura del cliente degrada con gracia
-- (pushSharedBook devuelve null) y nada finge compartir.
--
-- Primero, el filtro de alcance de la C2 se convierte en UNA sola
-- implementación (faro_scoped) que usan tanto la lectura
-- (faro_shared_book) como este empuje: dos filtros que divergen serían
-- una cerca con dos alturas.
--
-- El empuje del miembro (faro_shared_push) cumple el papel y el alcance
-- TAMBIÉN escribiendo:
-- · Sin membresía activa → nada (una fila vacía con won=false).
-- · Papel «solo mira» → no escribe: devuelve su copia actual, won=false.
-- · El miembro empuja SU copia (la filtrada que la C2 le dio): el
--   servidor EMPALMA — las líneas fuera de su alcance se quedan como
--   están en el libro guardado, intactas; las de su alcance se
--   reemplazan por las suyas; sus lápidas borran (solo líneas de su
--   alcance: una lápida sobre lo que no puede ver se ignora).
-- · Concurrencia optimista, el ritmo de la casa: si la revisión del
--   servidor ya no es la base que el miembro leyó, no gana — recibe su
--   copia fresca con won=false, fusiona en el cliente (fuse.ts) y
--   reintenta. Sin fricción cuando no hay choque.
-- · Estructura, ajustes y auditoría NO se empalman: son del libro
--   guardado (ganan por revisión mayor en la fusión del cliente, con
--   la puerta de conflicto de la casa — Pieza C3, fuse.ts).
-- ============================================================================

-- ── El filtro de alcance, una sola vez ─────────────────────────────────────
create or replace function public.faro_scoped(book jsonb, m_scope jsonb)
returns jsonb language plpgsql immutable as $$
declare
  cats jsonb;
  out_months jsonb := '{}'::jsonb;
  mk text;
  mv jsonb;
  filtered jsonb;
  store_ids jsonb;
begin
  if coalesce((m_scope ->> 'all')::boolean, false) then
    return book - 'settings' - 'audit' - 'drafts';
  end if;
  cats := coalesce(m_scope -> 'cats', '[]'::jsonb);
  for mk, mv in select key, value from jsonb_each(coalesce(book -> 'months', '{}'::jsonb)) loop
    select coalesce(jsonb_agg(l), '[]'::jsonb) into filtered
      from jsonb_array_elements(coalesce(mv -> 'lines', '[]'::jsonb)) l
      where cats ? (l ->> 'categoryId');
    if jsonb_array_length(filtered) > 0 then
      out_months := out_months || jsonb_build_object(mk, jsonb_build_object('lines', filtered));
    end if;
  end loop;
  select coalesce(jsonb_agg(sid), '[]'::jsonb) into store_ids from (
    select distinct l ->> 'storeId' as sid
      from jsonb_each(out_months) mm,
           jsonb_array_elements(mm.value -> 'lines') l
      where l ->> 'storeId' is not null
  ) q;
  return jsonb_build_object(
    'v', book -> 'v',
    'revision', book -> 'revision',
    'updatedAt', book -> 'updatedAt',
    'months', out_months,
    'structure', jsonb_build_object(
      'base', book -> 'structure' -> 'base',
      'categories', (
        select coalesce(jsonb_agg(c), '[]'::jsonb)
          from jsonb_array_elements(coalesce(book -> 'structure' -> 'categories', '[]'::jsonb)) c
          where cats ? (c ->> 'id')),
      'catalog', (
        select coalesce(jsonb_agg(s), '[]'::jsonb)
          from jsonb_array_elements(coalesce(book -> 'structure' -> 'catalog', '[]'::jsonb)) s
          where store_ids ? (s ->> 'id')),
      'purchases', (
        select coalesce(jsonb_agg(p), '[]'::jsonb)
          from jsonb_array_elements(coalesce(book -> 'structure' -> 'purchases', '[]'::jsonb)) p
          where cats ? (p ->> 'categoryId')))
  );
end $$;

-- ── La lectura de la C2, sobre el mismo filtro ─────────────────────────────
create or replace function public.faro_shared_book(p_owner uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m_scope jsonb;
  book jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_owner = uid then return null; end if;
  select scope into m_scope from public.faro_memberships
    where book_owner = p_owner and member = uid and status = 'active';
  if m_scope is null then return null; end if;
  select data_json into book from public.faro_ledgers where user_id = p_owner;
  if book is null then return null; end if;
  return public.faro_scoped(book, m_scope)::text;
end $$;

-- ── El empuje del miembro ──────────────────────────────────────────────────
create or replace function public.faro_shared_push(p_owner uuid, p_data text, p_base_revision integer)
returns table (data_json text, revision bigint, won boolean)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m_scope jsonb;
  m_role text;
  cur jsonb;
  cur_rev bigint;
  incoming jsonb;
  scope_all boolean;
  cats jsonb;
  stones jsonb;
  out_months jsonb := '{}'::jsonb;
  mk text;
  kept jsonb;
  mine jsonb;
  spliced jsonb;
  new_book jsonb;
  new_rev bigint;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select scope, role into m_scope, m_role from public.faro_memberships
    where book_owner = p_owner and member = uid and status = 'active';
  if m_scope is null then
    return query select null::text, null::bigint, false;
    return;
  end if;
  select data_json, l.revision into cur, cur_rev from public.faro_ledgers l where l.user_id = p_owner;
  if cur is null then
    return query select null::text, null::bigint, false;
    return;
  end if;
  if m_role <> 'note' or p_base_revision is distinct from cur_rev or p_data is null or length(p_data) > 800000 then
    return query select public.faro_scoped(cur, m_scope)::text, cur_rev, false;
    return;
  end if;
  incoming := p_data::jsonb;
  scope_all := coalesce((m_scope ->> 'all')::boolean, false);
  cats := coalesce(m_scope -> 'cats', '[]'::jsonb);
  stones := coalesce(incoming -> 'tombstones', '[]'::jsonb);

  -- El empalme, mes a mes sobre la unión de meses de ambos lados.
  for mk in
    select key from jsonb_each(coalesce(cur -> 'months', '{}'::jsonb))
    union
    select key from jsonb_each(coalesce(incoming -> 'months', '{}'::jsonb))
  loop
    if scope_all then
      select coalesce(jsonb_agg(l), '[]'::jsonb) into spliced
        from jsonb_array_elements(coalesce(incoming -> 'months' -> mk -> 'lines', '[]'::jsonb)) l
        where not exists (select 1 from jsonb_array_elements(stones) st where st ->> 'id' = l ->> 'id');
    else
      select coalesce(jsonb_agg(l), '[]'::jsonb) into kept
        from jsonb_array_elements(coalesce(cur -> 'months' -> mk -> 'lines', '[]'::jsonb)) l
        where not (cats ? (l ->> 'categoryId'));
      select coalesce(jsonb_agg(l), '[]'::jsonb) into mine
        from jsonb_array_elements(coalesce(incoming -> 'months' -> mk -> 'lines', '[]'::jsonb)) l
        where (cats ? (l ->> 'categoryId'))
          and not exists (select 1 from jsonb_array_elements(stones) st where st ->> 'id' = l ->> 'id')
          and not exists (select 1 from jsonb_array_elements(kept) k where k ->> 'id' = l ->> 'id');
      spliced := kept || mine;
    end if;
    if jsonb_array_length(spliced) > 0 then
      out_months := out_months || jsonb_build_object(mk, jsonb_build_object('lines', spliced));
    end if;
  end loop;

  new_rev := cur_rev + 1;
  new_book := cur;
  new_book := jsonb_set(new_book, '{months}', out_months);
  new_book := jsonb_set(new_book, '{revision}', to_jsonb(new_rev));
  if incoming ->> 'updatedAt' is not null then
    new_book := jsonb_set(new_book, '{updatedAt}', to_jsonb(incoming ->> 'updatedAt'));
  end if;
  -- Las lápidas se unen (por id queda la más reciente); con alcance de
  -- categorías, una lápida sobre una línea fuera del alcance — que
  -- sigue viva en el libro — no se guarda.
  new_book := jsonb_set(new_book, '{tombstones}', (
    select coalesce(jsonb_agg(t), '[]'::jsonb) from (
      select distinct on (u.t ->> 'id') u.t
        from (
          select t from jsonb_array_elements(coalesce(cur -> 'tombstones', '[]'::jsonb)) t
          union all
          select t from jsonb_array_elements(stones) t
            where scope_all
               or not exists (
                 select 1
                   from jsonb_each(coalesce(cur -> 'months', '{}'::jsonb)) mm,
                        jsonb_array_elements(mm.value -> 'lines') l
                   where l ->> 'id' = t ->> 'id' and not (cats ? (l ->> 'categoryId')))
        ) u
        order by u.t ->> 'id', u.t ->> 'at' desc
    ) g
  ));

  update public.faro_ledgers
    set data_json = new_book, revision = new_rev, updated_at = now()
    where user_id = p_owner;

  return query select public.faro_scoped(new_book, m_scope)::text, new_rev, true;
end $$;
revoke all on function public.faro_shared_push(uuid, text, integer) from public, anon;
grant execute on function public.faro_shared_push(uuid, text, integer) to authenticated;
