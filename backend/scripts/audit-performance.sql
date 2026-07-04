-- ==========================================================================
-- SUPERCOPIAS — Scripts de auditoría de rendimiento PostgreSQL
-- Ejecutar en horas pico o cuando se detecte lentitud en el backend.
-- Compatible con PostgreSQL 13+
-- ==========================================================================


-- --------------------------------------------------------------------------
-- 1. ACTIVIDAD ACTUAL DEL POOL: queries en vuelo, tiempo de ejecución y estado
--    Permite ver si el pool de 20 conexiones está saturado.
-- --------------------------------------------------------------------------
SELECT
    pid,
    usename            AS usuario,
    application_name   AS app,
    state,
    wait_event_type,
    wait_event,
    ROUND(EXTRACT(EPOCH FROM (NOW() - query_start))::numeric, 2) AS duracion_seg,
    LEFT(query, 120)   AS query_corto
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
ORDER BY duracion_seg DESC NULLS LAST;


-- --------------------------------------------------------------------------
-- 2. QUERIES BLOQUEADAS: detecta procesos que esperan un lock de otro proceso
--    Si aparece alguna fila, hay contención de escritura concurrente.
-- --------------------------------------------------------------------------
SELECT
    blocked.pid                 AS pid_bloqueado,
    blocked.usename             AS usuario_bloqueado,
    blocked.query               AS query_bloqueada,
    blocking.pid                AS pid_bloqueante,
    blocking.usename            AS usuario_bloqueante,
    blocking.query              AS query_bloqueante,
    ROUND(EXTRACT(EPOCH FROM (NOW() - blocked.query_start))::numeric, 2) AS espera_seg
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocking
    ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.datname = current_database()
ORDER BY espera_seg DESC;


-- --------------------------------------------------------------------------
-- 3. TABLAS CON MAYOR CONTENCIÓN DE LOCKS (últimas 24 h aprox.)
--    Útil para identificar qué tabla genera la mayor cola de espera.
-- --------------------------------------------------------------------------
SELECT
    schemaname,
    relname        AS tabla,
    n_dead_tup     AS filas_muertas,
    n_live_tup     AS filas_vivas,
    seq_scan,
    idx_scan,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 15;


-- --------------------------------------------------------------------------
-- 4. QUERIES MÁS LENTAS (requiere pg_stat_statements habilitado)
--    Si el módulo no está cargado, el super-usuario puede ejecutar:
--      CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
--    y reiniciar el servidor (o configurar shared_preload_libraries).
-- --------------------------------------------------------------------------
SELECT
    ROUND(total_exec_time::numeric / calls, 2)  AS avg_ms,
    calls,
    ROUND(total_exec_time::numeric, 0)           AS total_ms,
    LEFT(query, 160)                             AS query_corto
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY avg_ms DESC
LIMIT 20;


-- --------------------------------------------------------------------------
-- 5. ESTADO DEL POOL DESDE EL SERVIDOR (conexiones activas vs. máximo)
--    Compara con el max: 20 configurado en pg-pool.
-- --------------------------------------------------------------------------
SELECT
    COUNT(*)                              AS total_conexiones,
    COUNT(*) FILTER (WHERE state = 'active')  AS activas,
    COUNT(*) FILTER (WHERE state = 'idle')    AS ociosas,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_tx,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_pg
FROM pg_stat_activity
WHERE datname = current_database();


-- --------------------------------------------------------------------------
-- 6. TERMINAR FORZOSAMENTE UNA QUERY BLOQUEANTE (usar solo como último recurso)
--    Sustituir <PID> por el valor obtenido en la consulta 2.
-- --------------------------------------------------------------------------
-- SELECT pg_terminate_backend(<PID>);
