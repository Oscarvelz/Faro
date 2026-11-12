-- ============================================================================
-- faro_delete_account — ELIMINAR LA CUENTA PARA SIEMPRE (chat de ventanas,
-- 2026-11-11) — PREPARADO, PENDIENTE DE APLICAR en el editor SQL de Supabase
-- al portar la oleada (como el faro_push sin reloj de backups.sql: la
-- definición viva no vive en este repo).
--
-- Por qué existe: el cliente NO puede borrar un usuario de auth; solo el
-- servidor. La ventana «Eliminar cuenta» de Cuenta (gates.tsx) llama a esta
-- función vía RPC. La función borra SOLO las filas del que llama
-- (auth.uid(), jamás un parámetro: nadie puede borrar la cuenta de otro):
-- primero el libro (faro_ledgers) y los respaldos en la nube (faro_backups),
-- y al final el propio usuario de auth.users — sus identidades, sesiones y
-- tokens caen por las cascadas propias del esquema auth.
--
-- El cliente (cloud.ts deleteAccountForever) trata un error de esta llamada
-- como «la cuenta sigue viva» y no toca nada local: hasta que esta función
-- no esté aplicada en Supabase, el botón informa del fallo con honestidad
-- en vez de fingir un borrado.
--
-- Verificación al aplicar (NUNCA con la cuenta real): crear un usuario
-- desechable, entrar con él, tocar Eliminar cuenta escribiendo su correo, y
-- comprobar que (1) ya no puede entrar, (2) faro_ledgers y faro_backups no
-- guardan ninguna fila suya.
-- ============================================================================

create or replace function public.faro_delete_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.faro_backups where user_id = uid;
  delete from public.faro_ledgers where user_id = uid;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.faro_delete_account() from public, anon;
grant execute on function public.faro_delete_account() to authenticated;
