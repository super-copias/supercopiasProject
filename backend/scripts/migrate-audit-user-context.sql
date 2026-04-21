-- ─────────────────────────────────────────────────────────────
-- Migración: Contexto de usuario en auditoría de triggers
-- Problema: trigger_auditoria() jamás capturaba el usuario que
--           ejecutó la operación (usuario_id / usuario_nombre
--           quedaban NULL en toda la tabla auditoria).
-- Solución: el backend fija variables de sesión PG antes de cada
--           mutación usando BEGIN / SET LOCAL / COMMIT. El trigger
--           las lee con current_setting() y las guarda.
-- Ejecutar: psql -d supercopias -f migrate-audit-user-context.sql
-- ─────────────────────────────────────────────────────────────

-- 1. Actualizar la función trigger para leer el contexto de usuario
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_auditoria()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id      integer;
  v_user_nombre  varchar(255);
BEGIN
  -- Leer el contexto de usuario inyectado por el backend.
  -- current_setting('...', true) devuelve NULL en vez de ERROR si la variable no está definida.
  v_user_id     := nullif(current_setting('app.current_user_id',     true), '')::integer;
  v_user_nombre := nullif(current_setting('app.current_user_nombre', true), '');

  IF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (
      tabla, operacion, registro_id,
      datos_anteriores, modulo,
      usuario_id, usuario_nombre
    ) VALUES (
      TG_TABLE_NAME, TG_OP, OLD.id::varchar,
      row_to_json(OLD), TG_TABLE_NAME,
      v_user_id, v_user_nombre
    );
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (
      tabla, operacion, registro_id,
      datos_anteriores, datos_nuevos, modulo,
      usuario_id, usuario_nombre
    ) VALUES (
      TG_TABLE_NAME, TG_OP, NEW.id::varchar,
      row_to_json(OLD), row_to_json(NEW), TG_TABLE_NAME,
      v_user_id, v_user_nombre
    );
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (
      tabla, operacion, registro_id,
      datos_nuevos, modulo,
      usuario_id, usuario_nombre
    ) VALUES (
      TG_TABLE_NAME, TG_OP, NEW.id::varchar,
      row_to_json(NEW), TG_TABLE_NAME,
      v_user_id, v_user_nombre
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;
