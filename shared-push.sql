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
-- ── El predicado de alcance, una sola vez (Ola 33, Familia 7, G33-2) ──
-- El empalme casaba la categoría por TEXTO: «kept», «mine», la
-- guarda de lápidas y faro_scoped leían «l ->> 'categoryId'», que
-- CONVIERTE a texto cualquier valor JSON, mientras el cliente lee
-- la IDENTIDAD (scopeFilter con un Set estricto, las caminatas con
-- ===): la línea guardada con categoryId NUMÉRICO 42 se evaporaba
-- ante el empuje fiel de su miembro (su texto «42» casaba con el
-- alcance en «kept» y el miembro jamás la trajo en «mine»), y la
-- entrante con 42 aterrizaba en una categoría fantasma que ningún
-- filtro del cliente le atribuye — la especie de G31-2 («el tipo
-- antes que el texto») en el único campo que quedaba sin juicio
-- de tipo. La ley: el predicado juzga el TIPO antes que el texto —
-- el categoryId que no ES texto no está en el alcance de nadie:
-- cuenta como fuera de alcance en «kept» (la línea se queda,
-- intacta), no entra en «mine», no guarda su lápida como dentro, y
-- faro_scoped no lo enseña. La ausencia sigue contando como fuera
-- de alcance, como la Cura 32 falló (los llamantes envuelven el
-- predicado en el mismo coalesce de siempre donde la lógica de
-- tres valores lo pide). Y la razón de que el juicio viva AQUÍ y
-- no en faro_line_ok: ese juez es el espejo campo a campo del
-- juicio de líneas de isLedgerDeep, y la puerta del cliente NO
-- juzga categoryId — un espejo más estricto que su casa mataría
-- en el empalme líneas que la puerta del dueño admite (y las
-- guardadas jamás se re-juzgan: el remedio de la guardada no es
-- un juez nuevo, es que el alcance deje de atribuírsela a quien
-- no puede verla). Lo que se juzga es la ATRIBUCIÓN, no la línea.
create or replace function public.faro_cat_in(cats jsonb, l jsonb)
returns boolean language plpgsql immutable as $$
begin
  return jsonb_typeof(l -> 'categoryId') = 'string' and cats ? (l ->> 'categoryId');
end $$;

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
      where public.faro_cat_in(cats, l);
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
          where public.faro_cat_in(cats, p)))
  );
end $$;

-- ── El juez de la lápida, una sola vez (Ola 30, Familia 4, G30-2) ─────────
-- La misma ley que el cliente (tombstoneShapeOk en defaults.ts): id y
-- firmante no vacíos, y «at» una fecha ISO real — prefijo AAAA-MM-DD con
-- su fecha verdadera (la ida y vuelta: el 30 de febrero muere en el
-- cast) y el instante parseable. Devuelve el INSTANTE de la lápida, o
-- null si la lápida no pasa el juicio: una lápida desnuda ({id}) o
-- vacía ({}) no tiene instante, no entra en la unión y no mata líneas.
--
-- OLA 31 (Familia 6, G31-2): EL ESPEJO JUZGA EL TIPO ANTES QUE EL
-- TEXTO. El juez leía id/by con «->>», que CONVIERTE a texto cualquier
-- valor JSON: un id numérico, un by numérico, un id booleano o un by
-- objeto «pasaban», se guardaban verbatim y MATABAN (la línea "42"
-- murió por la lápida 42) — y el libro guardado no pasaba la puerta
-- del cliente, que exige typeof string. Y el «at» con un espacio al
-- borde pasaba el cast de Postgres mientras new Date del cliente lo
-- rehúsa. La ley espejo, entera: id, by y at se leen como JSON
-- (t -> 'campo') y deben SER texto antes de leerse como texto; el
-- «at» no lleva espacios al borde; y la ida y vuelta del cliente
-- incluye su trampa de años — Date.UTC lee los años 0–99 como
-- 1900+, así que un año menor que 100 jamás vuelve igual y muere en
-- las dos casas. La tabla de bordes (25 casos) firma 25/25 contra
-- PGlite en el banco de la cura.
create or replace function public.faro_stone_at(t jsonb)
returns timestamptz language plpgsql immutable as $$
declare
  at_txt text;
  d date;
  ts timestamptz;
begin
  -- «is distinct from», no «<>»: con el campo AUSENTE, jsonb_typeof
  -- devuelve null y un «<>» no dispara (la lógica de tres valores
  -- dejaba pasar la lápida sin id) — el espejo juzga también la
  -- ausencia, como el cliente, que lee undefined y rehúsa.
  if jsonb_typeof(t -> 'id') is distinct from 'string' or (t ->> 'id') = '' then return null; end if;
  if jsonb_typeof(t -> 'by') is distinct from 'string' or (t ->> 'by') = '' then return null; end if;
  if jsonb_typeof(t -> 'at') is distinct from 'string' then return null; end if;
  at_txt := t ->> 'at';
  if at_txt <> btrim(at_txt) then return null; end if;
  if at_txt !~ '^\d{4}-\d{2}-\d{2}' then return null; end if;
  begin
    d := substring(at_txt from 1 for 10)::date;
    ts := at_txt::timestamptz;
  exception when others then
    return null;
  end;
  if extract(year from d) < 100 then return null; end if;
  return ts;
end $$;

-- ── El juez del número, una sola vez (Ola 32, Familia 5, G32-1) ───────
-- El espejo juzgaba el TIPO del número, no su FINITUD: un numeric de
-- jsonb vive en precisión arbitraria y un double de JS muere en
-- ~1.8e308 — el literal 1e999 es un número válido para Postgres e
-- Infinity para el cliente, cuya puerta (isFinD) lo rehúsa. El
-- empalme lo guardaba y el libro guardado no pasaba isLedgerDeep.
-- Este juez lee el número COMO LO LEERÍA JS: el cast a float8 lo
-- delata — fuera del rango del double, el cast mismo muere (y un
-- valor dentro del rango jamás vuelve infinito de un numeric), así
-- que cast posible = finito en las dos casas, cast imposible = no
-- finito en la del cliente. Lo usan los tres campos numéricos de la
-- línea, en las dos ramas del empalme (pasan todos por faro_line_ok).
--
-- OLA 33 (Familia 6, G33-1): EL ESPEJO ES EXACTO TAMBIÉN POR ABAJO.
-- La premisa de la Ola 32 miraba solo hacia arriba: el cast muere
-- TAMBIÉN por underflow — Postgres rehúsa con «out of range» todo
-- numeric NO NULO que el double redondea a cero (1e-999, 1e-400,
-- 1e-324, 2e-324 y sus negativos), mientras JS lee esos mismos
-- literales como 0 — finito — y la puerta del cliente los admite:
-- el empalme perdía la línea en silencio, la dirección contraria
-- a G32-1. La franja se juzga ANTES del cast, sobre el numeric
-- mismo (que nunca muere): lo no nulo cuyo valor absoluto queda
-- bajo la mitad del subnormal mínimo del double (~2.47e-324) es,
-- en la lectura de JS, cero — finito en las dos casas. Sobre esa
-- franja el cast ya no muere (3e-324 vuelve 5e-324) y su veredicto
-- manda como siempre; el cero exacto con exponente imposible
-- (0e-999) sigue pasando por el cast, que lo lee 0.
create or replace function public.faro_num_ok(v jsonb)
returns boolean language plpgsql immutable as $$
declare
  f float8;
  n numeric;
begin
  if jsonb_typeof(v) is distinct from 'number' then return false; end if;
  n := (v #>> '{}')::numeric;
  if n <> 0 and abs(n) < '2.5e-324'::numeric then return true; end if;
  begin
    f := (v #>> '{}')::float8;
  exception when others then
    return false;
  end;
  return f > '-Infinity'::float8 and f < 'Infinity'::float8;
end $$;

-- ── El juez de la línea, una sola vez (Ola 31, Familia 6, G31-1) ────────
-- El empalme juzgaba las lápidas que guarda y NO las líneas: una línea
-- con amountMinor de texto se empalma verbatim y el libro guardado no
-- pasa la puerta del cliente (isLedgerDeep) — el servidor fabricaba el
-- libro que el dueño no puede abrir. Este juez es el espejo campo a
-- campo del juicio de líneas de isLedgerDeep (defaults.ts): la línea
-- es un objeto; id, kind, concept y currency SON texto (se leen como
-- JSON, no convertidos); amountMinor es número; y los opcionales, en
-- su dimensión — balanceMinor ausente, nulo o número; aprBps ausente
-- o número (nulo NO: el cliente lo rehúsa); by, byName, fundedBy y
-- declaredAccount ausentes o texto; declaration ausente o booleano;
-- mirrorOf ausente u objeto con book y line de texto.
-- OLA 32 (Familia 5, G32-1): los tres campos numéricos se juzgan con
-- faro_num_ok — número Y finito en la lectura de JS, como isFinD.
create or replace function public.faro_line_ok(l jsonb)
returns boolean language plpgsql immutable as $$
begin
  if jsonb_typeof(l) is distinct from 'object' then return false; end if;
  -- Los requeridos van con «is distinct from»: con el campo ausente,
  -- jsonb_typeof devuelve null y un «<>» jamás dispararía — la
  -- ausencia se juzga, como en el cliente (undefined no es string).
  if jsonb_typeof(l -> 'id') is distinct from 'string' or jsonb_typeof(l -> 'kind') is distinct from 'string'
     or jsonb_typeof(l -> 'concept') is distinct from 'string' or jsonb_typeof(l -> 'currency') is distinct from 'string' then
    return false;
  end if;
  if not public.faro_num_ok(l -> 'amountMinor') then return false; end if;
  if l -> 'balanceMinor' is not null and jsonb_typeof(l -> 'balanceMinor') is distinct from 'null'
     and not public.faro_num_ok(l -> 'balanceMinor') then return false; end if;
  if l -> 'aprBps' is not null and not public.faro_num_ok(l -> 'aprBps') then return false; end if;
  if l -> 'by' is not null and jsonb_typeof(l -> 'by') is distinct from 'string' then return false; end if;
  if l -> 'byName' is not null and jsonb_typeof(l -> 'byName') is distinct from 'string' then return false; end if;
  if l -> 'fundedBy' is not null and jsonb_typeof(l -> 'fundedBy') is distinct from 'string' then return false; end if;
  if l -> 'declaredAccount' is not null and jsonb_typeof(l -> 'declaredAccount') is distinct from 'string' then return false; end if;
  if l -> 'declaration' is not null and jsonb_typeof(l -> 'declaration') is distinct from 'boolean' then return false; end if;
  if l -> 'mirrorOf' is not null and (jsonb_typeof(l -> 'mirrorOf') is distinct from 'object'
     or jsonb_typeof(l -> 'mirrorOf' -> 'book') is distinct from 'string'
     or jsonb_typeof(l -> 'mirrorOf' -> 'line') is distinct from 'string') then return false; end if;
  return true;
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
  stones_ok jsonb := '[]'::jsonb;
  unioned jsonb;
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
  -- OLA 30 (Familia 4, G30-2a): la columna va CALIFICADA — el parámetro
  -- OUT data_json de esta función colisiona con la columna
  -- faro_ledgers.data_json y el «select data_json …» sin calificar moría
  -- al correr («column reference is ambiguous»): la función, tal como
  -- estaba pegada en el repo, no corría; su hermana de lectura sí.
  select l.data_json, l.revision into cur, cur_rev from public.faro_ledgers l where l.user_id = p_owner;
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
  -- OLA 30 (Familia 4, G30-2b): las lápidas entrantes se juzgan ANTES
  -- de usarse (faro_stone_at): el predicado de muerte del empalme corre
  -- sobre stones_ok, no sobre el crudo — antes casaba solo por id, y
  -- una lápida desnuda ({id}) o vacía ({}) borraba líneas entrantes y
  -- se guardaba tal cual en el libro.
  select coalesce(jsonb_agg(t), '[]'::jsonb) into stones_ok
    from jsonb_array_elements(stones) t
    where public.faro_stone_at(t) is not null;

  -- El empalme, mes a mes sobre la unión de meses de ambos lados.
  -- OLA 31 (Familia 6, G31-1): cada línea que el empalme GUARDA pasa
  -- por el juez espejo (faro_line_ok) — una línea que la puerta del
  -- cliente rehusaría NO se guarda: el empuje gana sin ella, como con
  -- las lápidas que no pasan su juez (que no entran ni matan), y el
  -- desenlace lo dice en el libro devuelto, donde la línea no está.
  -- Las líneas ya guardadas (kept) no se re-juzgan aquí: no son de
  -- este empuje.
  for mk in
    select key from jsonb_each(coalesce(cur -> 'months', '{}'::jsonb))
    union
    select key from jsonb_each(coalesce(incoming -> 'months', '{}'::jsonb))
  loop
    if scope_all then
      select coalesce(jsonb_agg(l), '[]'::jsonb) into spliced
        from jsonb_array_elements(coalesce(incoming -> 'months' -> mk -> 'lines', '[]'::jsonb)) l
        where public.faro_line_ok(l)
          and not exists (select 1 from jsonb_array_elements(stones_ok) st where st ->> 'id' = l ->> 'id');
    else
      -- OLA 32 (Familia 6, G32-2): «kept» juzga la AUSENCIA como
      -- fuera de alcance — con categoryId ausente, «cats ? null» es
      -- NULL y «not NULL» es NULL: la línea sin categoría no era
      -- «kept» ni «mine» y se evaporaba del libro guardado, contra
      -- la promesa de la cabecera («las líneas fuera de su alcance
      -- se quedan como están, intactas») y contra la puerta del
      -- cliente, que admite la línea sin categoría. La ausencia
      -- cuenta como fuera de alcance: lo que el miembro no puede
      -- ver, se queda.
      select coalesce(jsonb_agg(l), '[]'::jsonb) into kept
        from jsonb_array_elements(coalesce(cur -> 'months' -> mk -> 'lines', '[]'::jsonb)) l
        where coalesce(public.faro_cat_in(cats, l), false) is not true;
      select coalesce(jsonb_agg(l), '[]'::jsonb) into mine
        from jsonb_array_elements(coalesce(incoming -> 'months' -> mk -> 'lines', '[]'::jsonb)) l
        where public.faro_cat_in(cats, l)
          and public.faro_line_ok(l)
          and not exists (select 1 from jsonb_array_elements(stones_ok) st where st ->> 'id' = l ->> 'id')
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
  -- Las lápidas se unen: por id queda la del INSTANTE MAYOR, como el
  -- cliente curado — y solo entran las que pasan el juez (faro_stone_at),
  -- de AMBOS lados: lo que se guarda es solo lo que la puerta del cliente
  -- honra. OLA 30 (Familia 4, G30-2b): la unión vieja no juzgaba nada y
  -- ordenaba por el TEXTO de «at» descendente — «zzzz» ganaba a la
  -- lápida legítima y, entre dos fechas reales con husos distintos,
  -- quedaba el instante MENOR (el texto mayor), exactamente al revés
  -- del cliente. Con alcance de categorías, una lápida sobre una línea
  -- fuera del alcance — que sigue viva en el libro — no se guarda.
  -- OLA 32 (Familia 6): la guarda de esa lápida juzga la categoría
  -- ausente como fuera de alcance, con el mismo coalesce de «kept» —
  -- sin él, la lápida sobre la línea sin categoría se guardaba JUNTO
  -- a la línea que el empalme conserva intacta.
  select coalesce(jsonb_agg(t), '[]'::jsonb) into unioned from (
    select distinct on (u.t ->> 'id') u.t
      from (
        select t from jsonb_array_elements(coalesce(cur -> 'tombstones', '[]'::jsonb)) t
        union all
        select t from jsonb_array_elements(stones_ok) t
          where scope_all
             or not exists (
               select 1
                 from jsonb_each(coalesce(cur -> 'months', '{}'::jsonb)) mm,
                      jsonb_array_elements(mm.value -> 'lines') l
                 where l ->> 'id' = t ->> 'id' and coalesce(public.faro_cat_in(cats, l), false) is not true)
      ) u
      where public.faro_stone_at(u.t) is not null
      order by u.t ->> 'id', public.faro_stone_at(u.t) desc
  ) g;
  new_book := jsonb_set(new_book, '{tombstones}', unioned);

  update public.faro_ledgers
    set data_json = new_book, revision = new_rev, updated_at = now()
    where user_id = p_owner;

  return query select public.faro_scoped(new_book, m_scope)::text, new_rev, true;
end $$;
revoke all on function public.faro_shared_push(uuid, text, integer) from public, anon;
grant execute on function public.faro_shared_push(uuid, text, integer) to authenticated;
