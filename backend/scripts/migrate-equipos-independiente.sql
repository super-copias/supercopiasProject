-- =====================================================
-- Script de Migración: Módulo Equipos Independiente
-- =====================================================
-- Propósito: Convertir el módulo de equipos de un diseño
--            relacional (con FKs) a uno independiente (con nombres)
-- Fecha: Enero 2025
-- =====================================================

-- PASO 1: Backup de datos existentes (si existen tablas)
-- =====================================================

DO $$
BEGIN
    -- Verificar si las tablas existen antes de migrar
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipos') THEN
        RAISE NOTICE 'Migrando tablas de equipos a módulo independiente...';
        
        -- PASO 2: Agregar nuevas columnas de nombres
        -- =====================================================
        
        -- Tabla: equipos
        ALTER TABLE public.equipos 
        ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(255),
        ADD COLUMN IF NOT EXISTS responsable_nombre VARCHAR(255);
        
        -- Tabla: equipos_historial_contador
        ALTER TABLE public.equipos_historial_contador
        ADD COLUMN IF NOT EXISTS tecnico_nombre VARCHAR(255);
        
        -- Tabla: equipos_mantenimiento
        ALTER TABLE public.equipos_mantenimiento
        ADD COLUMN IF NOT EXISTS tecnico_nombre VARCHAR(255),
        ADD COLUMN IF NOT EXISTS proveedor_nombre VARCHAR(255);
        
        RAISE NOTICE 'Columnas de nombres agregadas exitosamente';
        
        -- PASO 3: Migrar datos de IDs a nombres (si existen FKs)
        -- =====================================================
        
        -- Migrar cliente_id -> cliente_nombre
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipos' AND column_name = 'cliente_id') THEN
            UPDATE public.equipos e
            SET cliente_nombre = COALESCE(c.nombre_comercial, c.razon_social)
            FROM public.clientes c
            WHERE e.cliente_id = c.id AND e.cliente_nombre IS NULL;
            
            RAISE NOTICE 'Datos de clientes migrados';
        END IF;
        
        -- Migrar responsable_id -> responsable_nombre
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipos' AND column_name = 'responsable_id') THEN
            UPDATE public.equipos e
            SET responsable_nombre = emp.nombre || ' ' || emp.apellido_paterno
            FROM public.empleados emp
            WHERE e.responsable_id = emp.id AND e.responsable_nombre IS NULL;
            
            RAISE NOTICE 'Datos de responsables migrados';
        END IF;
        
        -- Migrar tecnico_id -> tecnico_nombre (historial_contador)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipos_historial_contador' AND column_name = 'tecnico_id') THEN
            UPDATE public.equipos_historial_contador h
            SET tecnico_nombre = emp.nombre || ' ' || emp.apellido_paterno
            FROM public.empleados emp
            WHERE h.tecnico_id = emp.id AND h.tecnico_nombre IS NULL;
            
            RAISE NOTICE 'Datos de técnicos (contador) migrados';
        END IF;
        
        -- Migrar tecnico_id -> tecnico_nombre (mantenimiento)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipos_mantenimiento' AND column_name = 'tecnico_id') THEN
            UPDATE public.equipos_mantenimiento m
            SET tecnico_nombre = emp.nombre || ' ' || emp.apellido_paterno
            FROM public.empleados emp
            WHERE m.tecnico_id = emp.id AND m.tecnico_nombre IS NULL;
            
            RAISE NOTICE 'Datos de técnicos (mantenimiento) migrados';
        END IF;
        
        -- Migrar proveedor_id -> proveedor_nombre (si existe)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'equipos_mantenimiento' AND column_name = 'proveedor_id') THEN
            UPDATE public.equipos_mantenimiento m
            SET proveedor_nombre = p.nombre_comercial
            FROM public.proveedores p
            WHERE m.proveedor_id = p.id AND m.proveedor_nombre IS NULL;
            
            RAISE NOTICE 'Datos de proveedores migrados';
        END IF;
        
        -- PASO 4: Eliminar foreign keys
        -- =====================================================
        
        ALTER TABLE public.equipos 
        DROP CONSTRAINT IF EXISTS fk_equipos_cliente,
        DROP CONSTRAINT IF EXISTS fk_equipos_responsable;
        
        ALTER TABLE public.equipos_historial_contador
        DROP CONSTRAINT IF EXISTS fk_historial_tecnico;
        
        ALTER TABLE public.equipos_mantenimiento
        DROP CONSTRAINT IF EXISTS fk_mantenimiento_tecnico,
        DROP CONSTRAINT IF EXISTS fk_mantenimiento_proveedor;
        
        RAISE NOTICE 'Foreign keys eliminadas';
        
        -- PASO 5: Eliminar columnas de IDs
        -- =====================================================
        
        ALTER TABLE public.equipos
        DROP COLUMN IF EXISTS cliente_id,
        DROP COLUMN IF EXISTS responsable_id;
        
        ALTER TABLE public.equipos_historial_contador
        DROP COLUMN IF EXISTS tecnico_id;
        
        ALTER TABLE public.equipos_mantenimiento
        DROP COLUMN IF EXISTS tecnico_id,
        DROP COLUMN IF EXISTS proveedor_id;
        
        RAISE NOTICE 'Columnas de IDs eliminadas';
        
        -- PASO 6: Crear índices para campos de nombres
        -- =====================================================
        
        CREATE INDEX IF NOT EXISTS idx_equipos_cliente_nombre 
        ON public.equipos(cliente_nombre);
        
        CREATE INDEX IF NOT EXISTS idx_equipos_responsable_nombre 
        ON public.equipos(responsable_nombre);
        
        RAISE NOTICE 'Índices creados';
        
        -- PASO 7: Actualizar comentarios de tablas
        -- =====================================================
        
        COMMENT ON TABLE public.equipos IS 
        'Tabla principal de equipos electrónicos del negocio - Módulo independiente';
        
        COMMENT ON TABLE public.equipos_historial_contador IS 
        'Historial de lecturas de contador para impresoras y fotocopiadoras - Módulo independiente';
        
        COMMENT ON TABLE public.equipos_mantenimiento IS 
        'Historial de mantenimientos y servicios realizados a equipos - Módulo independiente';
        
        RAISE NOTICE '✅ Migración completada exitosamente';
        
    ELSE
        RAISE NOTICE '⚠️ Las tablas de equipos no existen. Ejecute el script de creación completo.';
    END IF;
END $$;

-- =====================================================
-- Verificación post-migración
-- =====================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Contar equipos
    SELECT COUNT(*) INTO v_count FROM public.equipos;
    RAISE NOTICE 'Total de equipos: %', v_count;
    
    -- Contar equipos con cliente
    SELECT COUNT(*) INTO v_count FROM public.equipos WHERE cliente_nombre IS NOT NULL;
    RAISE NOTICE 'Equipos con cliente: %', v_count;
    
    -- Contar equipos con responsable
    SELECT COUNT(*) INTO v_count FROM public.equipos WHERE responsable_nombre IS NOT NULL;
    RAISE NOTICE 'Equipos con responsable: %', v_count;
    
    -- Contar registros de contador
    SELECT COUNT(*) INTO v_count FROM public.equipos_historial_contador;
    RAISE NOTICE 'Registros de contador: %', v_count;
    
    -- Contar mantenimientos
    SELECT COUNT(*) INTO v_count FROM public.equipos_mantenimiento;
    RAISE NOTICE 'Registros de mantenimiento: %', v_count;
END $$;
