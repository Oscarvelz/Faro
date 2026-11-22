-- ============================================================================
-- EL LIBRO COMPARTIDO — Pieza C2 (1.3.391): LOS ALCANCES SE CUMPLEN EN EL
-- SERVIDOR. Se pega en el editor SQL de Supabase DESPUÉS de memberships.sql
-- (la Pieza C1). Hasta que se pegue, la costura del cliente degrada con
-- gracia (fetchSharedBook devuelve null) y nada finge compartir.
--
-- La cerca 1 del brief: el alcance se cumple EN EL SERVIDOR, no en la
-- pantalla. La lectura normal de faro_ledgers está cerrada por RLS al
-- dueño de cada fila, así que el miembro NO puede leer el libro del dueño
-- por ningún camino directo: su única puerta es esta función, que le
-- entrega una COPIA FILTRADA — las líneas fuera de su alcance nunca salen
-- del servidor, ni sus categorías, ni las tiendas que solo ellas nombran.
--
-- Qué viaja y qué no (declarado):
-- · Viajan: la versión y la revisión del libro, los meses con líneas de
--   su alcance (el mes que queda vacío NO viaja: ni el ritmo del dueño),
--   las categorías de su alcance, las tiendas que sus líneas nombran, la
--   base del libro y — solo con alcance entero — las compras vigiladas
--   (una compra sin categoría no se puede probar dentro de un alcance de
--   categorías: no viaja).
-- · NO viajan nunca, ni con alcance entero: los ajustes del dueño (son
--   de su cuenta, no del libro), su auditoría (la actividad compartida,
--   firmada y simétrica, es la Pieza C4) y su bandeja (los borradores
--   son de quien los captura).
-- · El dueño no usa esta puerta: su camino es la sincronización de
--   siempre. Sin membresía activa, la respuesta es null — no un error
--   que confiese que el libro existe.
-- · El papel (anota / solo mira) aquí no distingue: esta puerta solo
--   lee. El camino de ESCRITURA compartida nace con la Pieza C3, y ahí
--   el papel se cumplirá también en el servidor.
-- ============================================================================

create or replace function public.faro_shared_book(p_owner uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  m_scope jsonb;
  book jsonb;
  cats jsonb;
  out_months jsonb := '{}'::jsonb;
  mk text;
  mv jsonb;
  filtered jsonb;
  store_ids jsonb;
  out_struct jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_owner = uid then return null; end if;
  select scope into m_scope from public.faro_memberships
    where book_owner = p_owner and member = uid and status = 'active';
  if m_scope is null then return null; end if;
  select data_json into book from public.faro_ledgers where user_id = p_owner;
  if book is null then return null; end if;

  -- Alcance entero: viaja el libro, sin lo que nunca viaja.
  if coalesce((m_scope ->> 'all')::boolean, false) then
    return (book - 'settings' - 'audit' - 'drafts')::text;
  end if;

  cats := coalesce(m_scope -> 'cats', '[]'::jsonb);

  -- Meses: solo las líneas de su alcance; el mes vacío no viaja.
  for mk, mv in select key, value from jsonb_each(coalesce(book -> 'months', '{}'::jsonb)) loop
    select coalesce(jsonb_agg(l), '[]'::jsonb) into filtered
      from jsonb_array_elements(coalesce(mv -> 'lines', '[]'::jsonb)) l
      where cats ? (l ->> 'categoryId');
    if jsonb_array_length(filtered) > 0 then
      out_months := out_months || jsonb_build_object(mk, jsonb_build_object('lines', filtered));
    end if;
  end loop;

  -- Tiendas: solo las que sus líneas nombran.
  select coalesce(jsonb_agg(sid), '[]'::jsonb) into store_ids from (
    select distinct l ->> 'storeId' as sid
      from jsonb_each(out_months) mm,
           jsonb_array_elements(mm.value -> 'lines') l
      where l ->> 'storeId' is not null
  ) q;

  out_struct := jsonb_build_object(
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
        where cats ? (p ->> 'categoryId'))
  );

  return jsonb_build_object(
    'v', book -> 'v',
    'revision', book -> 'revision',
    'updatedAt', book -> 'updatedAt',
    'months', out_months,
    'structure', out_struct
  )::text;
end $$;
revoke all on function public.faro_shared_book(uuid) from public, anon;
grant execute on function public.faro_shared_book(uuid) to authenticated;
