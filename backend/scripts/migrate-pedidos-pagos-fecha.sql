-- ============================================================
-- Migración: corrección de corte de caja para anticipos editados
--
-- Cambios:
--   1. Nueva columna fecha_pago en pos_pedidos_pagos
--   2. Backfill de fechas históricas
--   3. Constraint chk_ppp_orden ampliado (de máx. 2 a máx. 10)
--   4. Split de anticipos editados: original en día de creación,
--      delta en día de la edición
--
-- El script es IDEMPOTENTE: puede ejecutarse aunque ya se haya
-- corrido parcialmente en un entorno (comprueba existencia antes
-- de cada cambio destructivo).
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Agregar columna fecha_pago (idempotente con IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pos_pedidos_pagos ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────
-- 2. Backfill sólo de filas que aún tienen fecha_pago NULL
--    (permite re-ejecutar sin pisar correcciones previas)
-- ─────────────────────────────────────────────────────────────
-- 2a. Anticipos → fecha de creación del pedido
UPDATE pos_pedidos_pagos pp
SET fecha_pago = ped.fecha_creacion
FROM pos_pedidos ped
WHERE pp.pedido_id = ped.id
  AND pp.tipo = 'anticipo'
  AND pp.fecha_pago IS NULL;

-- 2b. Saldos → fecha de entrega (o creación si aún no fue entregado)
UPDATE pos_pedidos_pagos pp
SET fecha_pago = COALESCE(ped.fecha_entregado, ped.fecha_creacion)
FROM pos_pedidos ped
WHERE pp.pedido_id = ped.id
  AND pp.tipo = 'saldo'
  AND pp.fecha_pago IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. NOT NULL + DEFAULT NOW()
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pos_pedidos_pagos ALTER COLUMN fecha_pago SET NOT NULL;
ALTER TABLE pos_pedidos_pagos ALTER COLUMN fecha_pago SET DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────
-- 4. Ampliar constraint de orden: de ARRAY[1,2] a rango 1..10
--    Necesario para el nuevo esquema de pagos parciales de anticipo
-- ─────────────────────────────────────────────────────────────
ALTER TABLE pos_pedidos_pagos DROP CONSTRAINT IF EXISTS chk_ppp_orden;
ALTER TABLE pos_pedidos_pagos ADD CONSTRAINT chk_ppp_orden
  CHECK (orden >= 1 AND orden <= 10);

-- ─────────────────────────────────────────────────────────────
-- 5. Mover fecha_pago de anticipos editados al día real de la edición
--    (sólo para registros que todavía tienen fecha_pago = fecha_creacion
--     y cuyo historial muestra una edición posterior)
-- ─────────────────────────────────────────────────────────────
UPDATE pos_pedidos_pagos pp
SET fecha_pago = sub.ultima_edicion
FROM (
  SELECT DISTINCT ON (ph.pedido_id)
    ph.pedido_id,
    ph.fecha AS ultima_edicion
  FROM pos_pedidos_historial ph
  WHERE ph.notas LIKE '%anticipo%→%' OR ph.notas LIKE '%anticipo%->%'
  ORDER BY ph.pedido_id, ph.fecha DESC
) sub
JOIN pos_pedidos ped ON ped.id = sub.pedido_id
WHERE pp.pedido_id = sub.pedido_id
  AND pp.tipo = 'anticipo'
  AND sub.ultima_edicion::date != pp.fecha_pago::date
  -- Protección idempotente: solo si el pedido tiene UN único registro de anticipo.
  -- Si ya fue dividido en el paso 6, los registros "original" no deben moverse.
  AND (
    SELECT COUNT(*) FROM pos_pedidos_pagos pp2
    WHERE pp2.pedido_id = pp.pedido_id AND pp2.tipo = 'anticipo'
  ) = 1;

-- ─────────────────────────────────────────────────────────────
-- 6. Split de anticipos editados desde un monto previo > 0
--
--    Escenario: el anticipo pasó de $X a $Y (X > 0, Y > X).
--    El código anterior borraba el registro y creaba uno nuevo
--    con $Y en el día de edición, perdiendo los $X del día original.
--
--    Corrección:
--      - El registro actual (fecha_pago = día edición, monto = $Y)
--        queda como el DELTA ($Y - $X)
--      - Se inserta un registro nuevo con el monto ORIGINAL ($X)
--        a la fecha de creación del pedido
--
--    El bloque DO es idempotente: comprueba que el pedido tenga
--    exactamente UN registro de anticipo antes de dividirlo.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r           RECORD;
  monto_orig  NUMERIC;
  monto_delta NUMERIC;
  pago        RECORD;
BEGIN
  FOR r IN
    -- Pedidos con un único registro de anticipo atribuido a día distinto al de creación
    -- y cuyo historial muestra un cambio de monto desde un valor > 0
    SELECT ped.id AS pedido_id, ped.fecha_creacion
    FROM pos_pedidos ped
    WHERE EXISTS (
        SELECT 1 FROM pos_pedidos_pagos pp
        WHERE pp.pedido_id = ped.id
          AND pp.tipo = 'anticipo'
          AND pp.fecha_pago::date != ped.fecha_creacion::date
    )
    AND (
        SELECT COUNT(*) FROM pos_pedidos_pagos pp
        WHERE pp.pedido_id = ped.id AND pp.tipo = 'anticipo'
    ) = 1   -- todavía no fue dividido
    AND EXISTS (
        SELECT 1 FROM pos_pedidos_historial ph
        WHERE ph.pedido_id = ped.id
          AND ph.notas NOT LIKE '%anticipo agregado%'
          AND ph.notas LIKE '%anticipo $%'
          AND ph.notas LIKE '%→%'
    )
  LOOP
    -- Extraer el monto ANTERIOR al primer cambio de anticipo registrado en historial
    SELECT CAST((regexp_match(ph.notas, 'anticipo \$([0-9]+\.?[0-9]*)'))[1] AS NUMERIC)
    INTO monto_orig
    FROM pos_pedidos_historial ph
    WHERE ph.pedido_id = r.pedido_id
      AND ph.notas NOT LIKE '%anticipo agregado%'
      AND ph.notas LIKE '%anticipo $%'
      AND ph.notas LIKE '%→%'
    ORDER BY ph.fecha ASC
    LIMIT 1;

    CONTINUE WHEN monto_orig IS NULL OR monto_orig <= 0;

    -- Obtener el registro de anticipo actual
    SELECT * INTO pago
    FROM pos_pedidos_pagos
    WHERE pedido_id = r.pedido_id AND tipo = 'anticipo'
    LIMIT 1;

    monto_delta := pago.monto - monto_orig;
    CONTINUE WHEN monto_delta <= 0;  -- El monto no aumentó, nada que dividir

    -- Ajustar registro actual → sólo el delta
    UPDATE pos_pedidos_pagos
    SET monto = monto_delta, orden = 2
    WHERE id = pago.id;

    -- Insertar el pago original a la fecha de creación del pedido
    INSERT INTO pos_pedidos_pagos
      (pedido_id, tipo, orden, metodo_pago_codigo, metodo_pago_descripcion,
       monto, monto_recibido, cambio, fecha_pago)
    VALUES
      (r.pedido_id, 'anticipo', 1,
       pago.metodo_pago_codigo, pago.metodo_pago_descripcion,
       monto_orig, NULL, 0,
       r.fecha_creacion);
  END LOOP;
END $$;

COMMIT;
