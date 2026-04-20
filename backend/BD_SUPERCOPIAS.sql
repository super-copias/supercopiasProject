--
-- PostgreSQL database dump
--

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: generar_username(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generar_username(p_nombre character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$

DECLARE

    base_username VARCHAR;

    counter INTEGER := 1;

    final_username VARCHAR;

BEGIN

    -- Limpiar nombre para username

    base_username := LOWER(REGEXP_REPLACE(p_nombre, '[^a-zA-Z]', '', 'g'));

    base_username := LEFT(base_username, 10);

    

    -- Buscar siguiente número disponible

    LOOP

        final_username := LPAD(counter::text, 3, '0') || '.' || base_username;

        

        IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN

            EXIT;

        END IF;

        

        counter := counter + 1;

        

        -- Expandir a 4 dígitos si es necesario

        IF counter > 999 THEN

            final_username := LPAD(counter::text, 4, '0') || '.' || base_username;

            IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN

                EXIT;

            END IF;

        END IF;

        

        -- Límite de seguridad

        IF counter > 9999 THEN

            RAISE EXCEPTION 'No se puede generar username único para: %', p_nombre;

        END IF;

    END LOOP;

    

    RETURN final_username;

END;

$$;


--
-- Name: obtener_estadisticas_generales(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_estadisticas_generales() RETURNS json
    LANGUAGE plpgsql
    AS $$

DECLARE

    resultado JSON;

BEGIN

    SELECT json_build_object(

        'usuarios', (SELECT COUNT(*) FROM usuarios WHERE activo = true),

        'empleados', (SELECT COUNT(*) FROM empleados WHERE activo = true),

        'clientes', (SELECT COUNT(*) FROM clientes WHERE activo = true),

        'proveedores', (SELECT COUNT(*) FROM proveedores WHERE activo = true),

        'sucursales', (SELECT COUNT(*) FROM sucursales WHERE activa = true),

        'ultimo_acceso', (SELECT MAX(ultimo_acceso) FROM usuarios),

        'empleados_nuevos_mes', (

            SELECT COUNT(*) FROM empleados 

            WHERE fecha_ingreso >= date_trunc('month', CURRENT_DATE)

        ),

        'clientes_nuevos_mes', (

            SELECT COUNT(*) FROM clientes 

            WHERE fecha_registro >= date_trunc('month', CURRENT_DATE)

        )

    ) INTO resultado;

    

    RETURN resultado;

END;

$$;


--
-- Name: trigger_auditoria(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_user_id      integer;
  v_user_nombre  varchar(255);
BEGIN
  -- Leer el contexto de usuario inyectado por el backend vía SET LOCAL.
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


--
-- Name: trigger_eventos_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_eventos_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


--
-- Name: trigger_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.fecha_modificacion = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria (
    id               integer NOT NULL,
    tabla            character varying(100) NOT NULL,
    operacion        character varying(20) NOT NULL,
    registro_id      character varying(50) NOT NULL,
    datos_anteriores jsonb,
    datos_nuevos     jsonb,
    usuario_id       integer,
    ip_address       inet,
    fecha_operacion  timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_nombre   character varying(255),
    modulo           character varying(50),
    accion           character varying(100),
    CONSTRAINT chk_auditoria_operacion CHECK (((operacion)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text])))
);


--
-- Name: TABLE auditoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auditoria IS 'Registro completo de operaciones para auditoría';
COMMENT ON COLUMN public.auditoria.usuario_nombre IS 'Nombre legible del usuario que generó el cambio (si aplica)';
COMMENT ON COLUMN public.auditoria.modulo         IS 'Módulo del sistema: clientes, empleados, inventarios, pos, equipos...';
COMMENT ON COLUMN public.auditoria.accion         IS 'Descripción semántica de la acción, ej. CANCELAR_VENTA';


--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_id_seq OWNED BY public.auditoria.id;


--
-- Name: cat_estatus_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_estatus_equipo (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    color character varying(20),
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cat_estatus_equipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_estatus_equipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_estatus_equipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_estatus_equipo_id_seq OWNED BY public.cat_estatus_equipo.id;


--
-- Name: cat_marcas_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_marcas_equipo (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cat_marcas_equipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_marcas_equipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_marcas_equipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_marcas_equipo_id_seq OWNED BY public.cat_marcas_equipo.id;


--
-- Name: cat_metodos_pago_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_metodos_pago_proveedor (
    id integer NOT NULL,
    clave character varying(50) NOT NULL,
    descripcion character varying(200) NOT NULL,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cat_metodos_pago_proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cat_metodos_pago_proveedor IS 'Catálogo de métodos de pago para proveedores';


--
-- Name: cat_metodos_pago_proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_metodos_pago_proveedor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_metodos_pago_proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_metodos_pago_proveedor_id_seq OWNED BY public.cat_metodos_pago_proveedor.id;


--
-- Name: cat_tipos_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_tipos_equipo (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    icono character varying(50),
    requiere_contador boolean DEFAULT false,
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cat_tipos_equipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_tipos_equipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_tipos_equipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_tipos_equipo_id_seq OWNED BY public.cat_tipos_equipo.id;


--
-- Name: cat_tipos_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_tipos_proveedor (
    id integer NOT NULL,
    clave character varying(50) NOT NULL,
    descripcion character varying(200) NOT NULL,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cat_tipos_proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cat_tipos_proveedor IS 'Catálogo de tipos de proveedor (Productos, Servicios, Mixto)';


--
-- Name: cat_tipos_proveedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_tipos_proveedor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_tipos_proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_tipos_proveedor_id_seq OWNED BY public.cat_tipos_proveedor.id;


--
-- Name: cat_impuestos_facturacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cat_impuestos_facturacion (
    id                 SERIAL PRIMARY KEY,
    nombre             VARCHAR(100)  NOT NULL,
    tipo               VARCHAR(30)   NOT NULL,  -- 'iva' | 'isr_retencion'
    porcentaje         NUMERIC(6,4)  NOT NULL,  -- 0.1600 / 0.0125
    activo             BOOLEAN       DEFAULT TRUE,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_impuesto_tipo CHECK (tipo IN ('iva','isr_retencion')),
    CONSTRAINT chk_impuesto_pct  CHECK (porcentaje >= 0 AND porcentaje <= 1)
);

INSERT INTO public.cat_impuestos_facturacion (nombre, tipo, porcentaje) VALUES
  ('IVA 16%',       'iva',          0.1600),
  ('ISR Retención', 'isr_retencion',0.0125)
ON CONFLICT DO NOTHING;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    rfc character varying(13),
    razon_social character varying(500),
    nombre_comercial character varying(500),
    email character varying(255),
    telefono character varying(20),
    direccion_codigo_postal character varying(10),
    regimen_fiscal character varying(10),
    uso_cfdi character varying(10),
    activo boolean DEFAULT true,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    direccion_entrega text,
    direccion_facturacion text,
    segundo_telefono character varying(20),
    segundo_email character varying(255),
    CONSTRAINT chk_clientes_email CHECK (((email IS NULL) OR ((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT chk_clientes_regimen_fiscal CHECK (((regimen_fiscal IS NULL) OR ((regimen_fiscal)::text ~ '^[0-9]{3}$'::text))),
    CONSTRAINT chk_clientes_segundo_email CHECK (((segundo_email IS NULL) OR ((segundo_email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)))
);


--
-- Name: TABLE clientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clientes IS 'Base de datos de clientes con información fiscal';


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleados (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    email character varying(255),
    telefono character varying(20),
    puesto_id integer,
    sucursal_id integer,
    salario numeric(10,2),
    fecha_ingreso date,
    activo boolean DEFAULT true,
    fecha_baja date,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_acceso character varying(50) DEFAULT 'limitado'::character varying,
    usuario_id integer,
    dias_vacaciones_sugeridos integer DEFAULT 12,
    notas_vacaciones text,
    turno character varying(20) NOT NULL,
    CONSTRAINT chk_empleados_email CHECK (((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_empleados_fecha_baja CHECK (((fecha_baja IS NULL) OR (fecha_baja >= fecha_ingreso))),
    CONSTRAINT chk_empleados_tipo_acceso CHECK (((tipo_acceso)::text = ANY (ARRAY[('completo'::character varying)::text, ('limitado'::character varying)::text, ('solo_lectura'::character varying)::text, ('administrador'::character varying)::text, ('personalizado'::character varying)::text, ('inactivo'::character varying)::text]))),
    CONSTRAINT empleados_turno_check CHECK (((turno)::text = ANY (ARRAY[('Matutino'::character varying)::text, ('Vespertino'::character varying)::text])))
);


--
-- Name: TABLE empleados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.empleados IS 'Información completa de empleados de la empresa';


--
-- Name: COLUMN empleados.turno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.empleados.turno IS 'Turno de trabajo del empleado: Matutino o Vespertino';


--
-- Name: empleados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empleados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleados_id_seq OWNED BY public.empleados.id;


--
-- Name: empleados_modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleados_modulos (
    id integer NOT NULL,
    empleado_id integer NOT NULL,
    modulo character varying(100) NOT NULL,
    acceso boolean DEFAULT false,
    fecha_asignacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE empleados_modulos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.empleados_modulos IS 'Permisos granulares por módulo para cada empleado';


--
-- Name: empleados_modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empleados_modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empleados_modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empleados_modulos_id_seq OWNED BY public.empleados_modulos.id;


--
-- Name: equipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipos (
    id integer NOT NULL,
    tipo_equipo character varying(50) NOT NULL,
    marca character varying(100),
    modelo character varying(100),
    numero_serie character varying(100),
    nombre_equipo character varying(150),
    area_ubicacion character varying(150),
    cliente_nombre character varying(255),
    estatus character varying(30) DEFAULT 'activo'::character varying,
    responsable_nombre character varying(255),
    observaciones text,
    foto_url character varying(500),
    fecha_alta timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    activo boolean DEFAULT true,
    mantenimiento_intervalo_dias integer,
    mantenimiento_fecha_inicio date,
    mantenimiento_dias_alerta integer DEFAULT 7,
    CONSTRAINT chk_equipos_estatus CHECK (((estatus)::text = ANY (ARRAY[('activo'::character varying)::text, ('inactivo'::character varying)::text, ('en_reparacion'::character varying)::text, ('baja'::character varying)::text]))),
    CONSTRAINT chk_equipos_tipo CHECK (((tipo_equipo)::text = ANY (ARRAY[('fotocopiadora'::character varying)::text, ('impresora'::character varying)::text, ('pc'::character varying)::text, ('laptop'::character varying)::text, ('monitor'::character varying)::text, ('router'::character varying)::text, ('escaner'::character varying)::text, ('otro'::character varying)::text])))
);


--
-- Name: TABLE equipos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.equipos IS 'Tabla principal de equipos electrÃ³nicos del negocio - MÃ³dulo independiente';


--
-- Name: COLUMN equipos.mantenimiento_intervalo_dias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.equipos.mantenimiento_intervalo_dias IS 'Días entre mantenimientos programados (NULL = sin mantenimiento preventivo)';


--
-- Name: COLUMN equipos.mantenimiento_fecha_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.equipos.mantenimiento_fecha_inicio IS 'Fecha desde la cual empezar a contar el intervalo';


--
-- Name: COLUMN equipos.mantenimiento_dias_alerta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.equipos.mantenimiento_dias_alerta IS 'Días de anticipación para mostrar alerta (default: 7)';


--
-- Name: equipos_caracteristicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipos_caracteristicas (
    id integer NOT NULL,
    equipo_id integer NOT NULL,
    caracteristicas jsonb DEFAULT '{}'::jsonb,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: equipos_caracteristicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipos_caracteristicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipos_caracteristicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipos_caracteristicas_id_seq OWNED BY public.equipos_caracteristicas.id;


--
-- Name: equipos_consumibles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipos_consumibles (
    id integer NOT NULL,
    equipo_id integer NOT NULL,
    tipo_consumible character varying(100) NOT NULL,
    fecha_instalacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    rendimiento_estimado integer,
    contador_instalacion integer,
    contador_proximo_cambio integer,
    observaciones text
);


--
-- Name: equipos_consumibles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipos_consumibles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipos_consumibles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipos_consumibles_id_seq OWNED BY public.equipos_consumibles.id;


--
-- Name: equipos_historial_contador; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipos_historial_contador (
    id integer NOT NULL,
    equipo_id integer NOT NULL,
    fecha_lectura timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    contador_actual integer NOT NULL,
    tecnico_nombre character varying(255),
    observaciones text
);


--
-- Name: equipos_historial_contador_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipos_historial_contador_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipos_historial_contador_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipos_historial_contador_id_seq OWNED BY public.equipos_historial_contador.id;


--
-- Name: equipos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipos_id_seq OWNED BY public.equipos.id;


--
-- Name: equipos_mantenimiento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipos_mantenimiento (
    id integer NOT NULL,
    equipo_id integer NOT NULL,
    fecha_servicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    contador_servicio integer,
    descripcion text NOT NULL,
    costo numeric(10,2),
    tecnico_nombre character varying(255),
    proveedor_nombre character varying(255),
    observaciones text
);


--
-- Name: equipos_mantenimiento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipos_mantenimiento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipos_mantenimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipos_mantenimiento_id_seq OWNED BY public.equipos_mantenimiento.id;


--
-- Name: estados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estados (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: estados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estados_id_seq OWNED BY public.estados.id;


--
-- Name: eventos_personal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_personal (
    id integer NOT NULL,
    empleado_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    horas_totales numeric(4,2),
    dias_totales integer,
    subtipo character varying(50),
    estado character varying(20) DEFAULT 'aprobado'::character varying,
    justificada boolean DEFAULT false,
    con_goce_sueldo boolean DEFAULT true,
    motivo text,
    observaciones text,
    documento_url character varying(500),
    registrado_por integer,
    aprobado_por integer,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT eventos_personal_estado_check CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('aprobado'::character varying)::text, ('rechazado'::character varying)::text]))),
    CONSTRAINT eventos_personal_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('vacaciones'::character varying)::text, ('falta'::character varying)::text, ('permiso'::character varying)::text, ('otro'::character varying)::text])))
);


--
-- Name: TABLE eventos_personal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.eventos_personal IS 'Registro de eventos de personal: vacaciones, faltas, permisos y otros';


--
-- Name: COLUMN eventos_personal.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.eventos_personal.tipo IS 'Tipo de evento: vacaciones, falta, permiso, otro';


--
-- Name: COLUMN eventos_personal.subtipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.eventos_personal.subtipo IS 'Clasificación adicional según el tipo (ej: enfermedad, personal, capacitación)';


--
-- Name: COLUMN eventos_personal.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.eventos_personal.estado IS 'Estado del evento: pendiente, aprobado, rechazado';


--
-- Name: eventos_personal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eventos_personal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eventos_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eventos_personal_id_seq OWNED BY public.eventos_personal.id;


--
-- Name: formas_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formas_pago (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(200) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: formas_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.formas_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: formas_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.formas_pago_id_seq OWNED BY public.formas_pago.id;


--
-- Name: inv_departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inv_departamentos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    color character varying(7) DEFAULT '#6c757d'::character varying,
    orden integer DEFAULT 0,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE inv_departamentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inv_departamentos IS 'Departamentos de inventario definidos por el usuario (Papel, Arillos, Servicios, etc.)';


--
-- Name: COLUMN inv_departamentos.color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inv_departamentos.color IS 'Color hexadecimal para identificación visual del departamento';


--
-- Name: inv_departamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inv_departamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inv_departamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inv_departamentos_id_seq OWNED BY public.inv_departamentos.id;


--
-- Name: inventarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventarios (
    id integer NOT NULL,
    tipo character varying(30) NOT NULL,
    nombre character varying(255) NOT NULL,
    categoria character varying(100) NOT NULL,
    marca character varying(100),
    modelo character varying(150),
    codigo_sku character varying(50),
    proveedor_id integer,
    proveedor_nombre character varying(255),
    estatus character varying(20) DEFAULT 'activo'::character varying,
    existencia_actual numeric(10,2) DEFAULT 0 NOT NULL,
    unidad_medida character varying(50) NOT NULL,
    stock_minimo numeric(10,2) DEFAULT 0 NOT NULL,
    stock_maximo numeric(10,2),
    ubicacion_fisica character varying(200),
    costo_compra numeric(12,2),
    precio_venta numeric(12,2),
    costo_promedio numeric(12,2),
    observaciones text,
    foto_url character varying(500),
    fecha_alta timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    activo boolean DEFAULT true,
    departamento_id integer,
    es_servicio boolean DEFAULT false NOT NULL,
    disponible_en_pos boolean DEFAULT false NOT NULL,
    descripcion text,
    tabulador_activo boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_inventarios_estatus CHECK (((estatus)::text = ANY (ARRAY[('activo'::character varying)::text, ('inactivo'::character varying)::text]))),
    CONSTRAINT chk_inventarios_tipo CHECK (((tipo)::text = ANY (ARRAY[('venta'::character varying)::text, ('insumo'::character varying)::text, ('generico'::character varying)::text])))
);


--
-- Name: TABLE inventarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventarios IS 'Tabla principal de inventarios - Productos para venta, insumos operativos e items genéricos';


--
-- Name: COLUMN inventarios.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventarios.tipo IS 'Tipo de artículo: venta, insumo, generico';


--
-- Name: COLUMN inventarios.categoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventarios.categoria IS 'Categoría del artículo (Papel, Consumibles, Engargolado, etc.)';


--
-- Name: COLUMN inventarios.proveedor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventarios.proveedor_id IS 'Referencia al proveedor del artículo (FK a proveedores)';


--
-- Name: COLUMN inventarios.stock_maximo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventarios.stock_maximo IS 'Cantidad máxima de existencias permitidas para alertas';


--
-- Name: inventarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventarios_id_seq OWNED BY public.inventarios.id;


--
-- Name: inv_tabulador_precios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inv_tabulador_precios (
    id integer NOT NULL,
    inventario_id integer NOT NULL,
    cantidad_desde numeric(12,2) NOT NULL,
    precio numeric(12,4) NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tabulador_cantidad_positiva CHECK (cantidad_desde > 0),
    CONSTRAINT chk_tabulador_precio_positivo CHECK (precio > 0)
);


--
-- Name: COMMENT inv_tabulador_precios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inv_tabulador_precios IS 'Tabulador de precios por volumen para artículos del inventario. Cada fila define un precio a partir de cierta cantidad.';


--
-- Name: inv_tabulador_precios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inv_tabulador_precios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inv_tabulador_precios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inv_tabulador_precios_id_seq OWNED BY public.inv_tabulador_precios.id;


--
-- Name: inventarios_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventarios_movimientos (
    id integer NOT NULL,
    inventario_id integer NOT NULL,
    tipo_movimiento character varying(30) NOT NULL,
    concepto character varying(50) NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    saldo_anterior numeric(10,2) NOT NULL,
    saldo_nuevo numeric(10,2) NOT NULL,
    usuario_nombre character varying(255),
    area_servicio character varying(200),
    notas text,
    evidencia_url character varying(500),
    fecha_movimiento timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movimientos_concepto CHECK (((concepto)::text = ANY (ARRAY[('compra'::character varying)::text, ('devolucion'::character varying)::text, ('ajuste_entrada'::character varying)::text, ('venta'::character varying)::text, ('uso_operativo'::character varying)::text, ('servicio_tecnico'::character varying)::text, ('merma'::character varying)::text, ('ajuste_salida'::character varying)::text, ('transferencia'::character varying)::text]))),
    CONSTRAINT chk_movimientos_tipo CHECK (((tipo_movimiento)::text = ANY (ARRAY[('entrada'::character varying)::text, ('salida'::character varying)::text, ('ajuste'::character varying)::text])))
);


--
-- Name: TABLE inventarios_movimientos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventarios_movimientos IS 'Historial completo de movimientos de inventario (entradas, salidas y ajustes)';


--
-- Name: COLUMN inventarios_movimientos.tipo_movimiento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventarios_movimientos.tipo_movimiento IS 'Tipo: entrada, salida, ajuste';


--
-- Name: COLUMN inventarios_movimientos.concepto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventarios_movimientos.concepto IS 'Concepto específico del movimiento';


--
-- Name: inventarios_movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventarios_movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventarios_movimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventarios_movimientos_id_seq OWNED BY public.inventarios_movimientos.id;


--
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metodos_pago (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(200) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metodos_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metodos_pago_id_seq OWNED BY public.metodos_pago.id;


--
-- Name: modulos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modulos (
    id integer NOT NULL,
    clave character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    icono character varying(100),
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modulos_id_seq OWNED BY public.modulos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre_comercial character varying(500) NOT NULL,
    razon_social character varying(500),
    rfc character varying(13),
    tipo_proveedor character varying(50) DEFAULT 'Mixto'::character varying,
    activo boolean DEFAULT true,
    nombre_contacto character varying(255),
    telefono character varying(20),
    email character varying(255),
    pagina_web character varying(500),
    direccion text,
    metodo_pago_principal character varying(100),
    cuenta_bancaria character varying(50),
    dias_credito integer DEFAULT 0,
    notas text,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_proveedores_dias_credito CHECK ((dias_credito >= 0)),
    CONSTRAINT chk_proveedores_email CHECK (((email IS NULL) OR ((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT chk_proveedores_rfc CHECK (((rfc IS NULL) OR (length((rfc)::text) = ANY (ARRAY[12, 13])))),
    CONSTRAINT chk_proveedores_tipo CHECK (((tipo_proveedor)::text = ANY (ARRAY[('Productos'::character varying)::text, ('Servicios'::character varying)::text, ('Mixto'::character varying)::text])))
);


--
-- Name: TABLE proveedores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proveedores IS 'Catálogo de proveedores con datos completos de contacto, dirección y condiciones de pago';


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: puestos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.puestos (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    descripcion text,
    salario_minimo numeric(10,2),
    salario_maximo numeric(10,2),
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_puestos_salario CHECK ((salario_maximo >= salario_minimo))
);


--
-- Name: TABLE puestos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.puestos IS 'Catálogo de puestos de trabajo';


--
-- Name: puestos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.puestos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: puestos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.puestos_id_seq OWNED BY public.puestos.id;


--
-- Name: regimenes_fiscales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regimenes_fiscales (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(500) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: regimenes_fiscales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regimenes_fiscales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regimenes_fiscales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regimenes_fiscales_id_seq OWNED BY public.regimenes_fiscales.id;


--
-- Name: sucursales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sucursales (
    id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    direccion text,
    telefono character varying(20),
    gerente character varying(255),
    activa boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE sucursales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sucursales IS 'Sucursales de la empresa';


--
-- Name: sucursales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sucursales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sucursales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sucursales_id_seq OWNED BY public.sucursales.id;


--
-- Name: usos_cfdi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usos_cfdi (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(500) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: usos_cfdi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usos_cfdi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usos_cfdi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usos_cfdi_id_seq OWNED BY public.usos_cfdi.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    email character varying(255),
    role character varying(50) DEFAULT 'empleado'::character varying NOT NULL,
    roles jsonb DEFAULT '[]'::jsonb,
    empleado_id integer,
    activo boolean DEFAULT true,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso timestamp with time zone,
    full_name character varying(500),
    phone character varying(20),
    bio text,
    profile_image character varying(500),
    must_reset_password boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_usuarios_email CHECK (((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_usuarios_role CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('gerente'::character varying)::text, ('empleado'::character varying)::text, ('invitado'::character varying)::text])))
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema con autenticación y autorización';

--
-- Name: COLUMN usuarios.must_reset_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.must_reset_password IS 'Bandera que obliga al usuario a cambiar su contraseña en el próximo inicio de sesión. Se activa cuando un administrador asigna una contraseña temporal desde el módulo de empleados.';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vacaciones_resumen; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vacaciones_resumen AS
 SELECT e.id AS empleado_id,
    e.nombre,
    e.dias_vacaciones_sugeridos,
    COALESCE(sum(
        CASE
            WHEN (((ep.tipo)::text = 'vacaciones'::text) AND ((ep.estado)::text = 'aprobado'::text) AND (EXTRACT(year FROM ep.fecha_inicio) = EXTRACT(year FROM CURRENT_DATE))) THEN ep.dias_totales
            ELSE 0
        END), (0)::bigint) AS dias_tomados_anio_actual,
    (e.dias_vacaciones_sugeridos - COALESCE(sum(
        CASE
            WHEN (((ep.tipo)::text = 'vacaciones'::text) AND ((ep.estado)::text = 'aprobado'::text) AND (EXTRACT(year FROM ep.fecha_inicio) = EXTRACT(year FROM CURRENT_DATE))) THEN ep.dias_totales
            ELSE 0
        END), (0)::bigint)) AS dias_restantes
   FROM (public.empleados e
     LEFT JOIN public.eventos_personal ep ON ((e.id = ep.empleado_id)))
  GROUP BY e.id, e.nombre, e.dias_vacaciones_sugeridos;


--
-- Name: VIEW vacaciones_resumen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vacaciones_resumen IS 'Vista de resumen de vacaciones por empleado para el año actual';


--
-- Name: vista_clientes_activos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_clientes_activos AS
 SELECT clientes.id,
    clientes.rfc,
    clientes.razon_social,
    clientes.nombre_comercial,
    clientes.email,
    clientes.telefono,
    clientes.segundo_telefono,
    clientes.direccion_entrega,
    clientes.direccion_facturacion,
    clientes.direccion_codigo_postal,
    clientes.regimen_fiscal,
    clientes.uso_cfdi,
    clientes.fecha_registro,
    clientes.fecha_modificacion
   FROM public.clientes
  WHERE (clientes.activo = true);


--
-- Name: vista_empleados_completa; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_empleados_completa AS
 SELECT e.id,
    e.nombre,
    e.email,
    e.telefono,
    p.nombre AS puesto,
    s.nombre AS sucursal,
    e.salario,
    e.fecha_ingreso,
    e.activo,
    e.fecha_baja,
    e.tipo_acceso,
    u.username,
    u.role AS rol_usuario,
    u.ultimo_acceso,
    COALESCE(jsonb_agg(jsonb_build_object('modulo', em.modulo, 'acceso', em.acceso)) FILTER (WHERE (em.modulo IS NOT NULL)), '[]'::jsonb) AS modulos
   FROM ((((public.empleados e
     LEFT JOIN public.usuarios u ON ((e.id = u.empleado_id)))
     LEFT JOIN public.empleados_modulos em ON ((e.id = em.empleado_id)))
     LEFT JOIN public.puestos p ON ((e.puesto_id = p.id)))
     LEFT JOIN public.sucursales s ON ((e.sucursal_id = s.id)))
  GROUP BY e.id, e.nombre, e.email, e.telefono, p.nombre, s.nombre, e.salario, e.fecha_ingreso, e.activo, e.fecha_baja, e.tipo_acceso, u.username, u.role, u.ultimo_acceso;


--
-- Name: auditoria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria ALTER COLUMN id SET DEFAULT nextval('public.auditoria_id_seq'::regclass);


--
-- Name: cat_estatus_equipo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estatus_equipo ALTER COLUMN id SET DEFAULT nextval('public.cat_estatus_equipo_id_seq'::regclass);


--
-- Name: cat_marcas_equipo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_marcas_equipo ALTER COLUMN id SET DEFAULT nextval('public.cat_marcas_equipo_id_seq'::regclass);


--
-- Name: cat_metodos_pago_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodos_pago_proveedor ALTER COLUMN id SET DEFAULT nextval('public.cat_metodos_pago_proveedor_id_seq'::regclass);


--
-- Name: cat_tipos_equipo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_equipo ALTER COLUMN id SET DEFAULT nextval('public.cat_tipos_equipo_id_seq'::regclass);


--
-- Name: cat_tipos_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_proveedor ALTER COLUMN id SET DEFAULT nextval('public.cat_tipos_proveedor_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: empleados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados ALTER COLUMN id SET DEFAULT nextval('public.empleados_id_seq'::regclass);


--
-- Name: empleados_modulos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados_modulos ALTER COLUMN id SET DEFAULT nextval('public.empleados_modulos_id_seq'::regclass);


--
-- Name: equipos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos ALTER COLUMN id SET DEFAULT nextval('public.equipos_id_seq'::regclass);


--
-- Name: equipos_caracteristicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_caracteristicas ALTER COLUMN id SET DEFAULT nextval('public.equipos_caracteristicas_id_seq'::regclass);


--
-- Name: equipos_consumibles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_consumibles ALTER COLUMN id SET DEFAULT nextval('public.equipos_consumibles_id_seq'::regclass);


--
-- Name: equipos_historial_contador id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_historial_contador ALTER COLUMN id SET DEFAULT nextval('public.equipos_historial_contador_id_seq'::regclass);


--
-- Name: equipos_mantenimiento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_mantenimiento ALTER COLUMN id SET DEFAULT nextval('public.equipos_mantenimiento_id_seq'::regclass);


--
-- Name: estados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados ALTER COLUMN id SET DEFAULT nextval('public.estados_id_seq'::regclass);


--
-- Name: eventos_personal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_personal ALTER COLUMN id SET DEFAULT nextval('public.eventos_personal_id_seq'::regclass);


--
-- Name: formas_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formas_pago ALTER COLUMN id SET DEFAULT nextval('public.formas_pago_id_seq'::regclass);


--
-- Name: inv_departamentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_departamentos ALTER COLUMN id SET DEFAULT nextval('public.inv_departamentos_id_seq'::regclass);


--
-- Name: inventarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios ALTER COLUMN id SET DEFAULT nextval('public.inventarios_id_seq'::regclass);


--
-- Name: inv_tabulador_precios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_tabulador_precios ALTER COLUMN id SET DEFAULT nextval('public.inv_tabulador_precios_id_seq'::regclass);


--
-- Name: inventarios_movimientos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_movimientos ALTER COLUMN id SET DEFAULT nextval('public.inventarios_movimientos_id_seq'::regclass);


--
-- Name: metodos_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_id_seq'::regclass);


--
-- Name: modulos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos ALTER COLUMN id SET DEFAULT nextval('public.modulos_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: puestos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puestos ALTER COLUMN id SET DEFAULT nextval('public.puestos_id_seq'::regclass);


--
-- Name: regimenes_fiscales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regimenes_fiscales ALTER COLUMN id SET DEFAULT nextval('public.regimenes_fiscales_id_seq'::regclass);


--
-- Name: sucursales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales ALTER COLUMN id SET DEFAULT nextval('public.sucursales_id_seq'::regclass);


--
-- Name: usos_cfdi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usos_cfdi ALTER COLUMN id SET DEFAULT nextval('public.usos_cfdi_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: auditoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auditoria (id, tabla, operacion, registro_id, datos_anteriores, datos_nuevos, usuario_id, ip_address, fecha_operacion) FROM stdin;
1	clientes	INSERT	1	\N	{"id": 1, "rfc": "PEGJ850315ABC", "email": "juan.perez@email.com", "activo": true, "telefono": "9611234567", "uso_cfdi": "G03", "razon_social": "Juan Perez Garcia", "segundo_email": null, "fecha_registro": "2025-12-08T14:53:22.041494-06:00", "regimen_fiscal": "612", "nombre_comercial": "Juan Perez Garcia", "segundo_telefono": "9611234568", "direccion_entrega": "Av. Central 123, Col. Centro, Tuxtla Gutierrez, Chiapas", "fecha_modificacion": "2025-12-08T14:53:22.041494-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-12-08 14:53:22.041494-06
2	clientes	INSERT	2	\N	{"id": 2, "rfc": "CLS920810XYZ", "email": "ventas@comlopez.com", "activo": true, "telefono": "9612345678", "uso_cfdi": "G01", "razon_social": "Comercializadora Lopez S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-12-08T14:53:22.041494-06:00", "regimen_fiscal": "601", "nombre_comercial": "Comercializadora Lopez S.A. de C.V.", "segundo_telefono": null, "direccion_entrega": "Blvd. Belisario Dominguez 456, Col. Moctezuma, Tuxtla Gutierrez, Chiapas", "fecha_modificacion": "2025-12-08T14:53:22.041494-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29030"}	\N	\N	2025-12-08 14:53:22.041494-06
3	clientes	INSERT	3	\N	{"id": 3, "rfc": "GOHM750425DEF", "email": "maria.gonzalez@email.com", "activo": true, "telefono": "9673456789", "uso_cfdi": "G03", "razon_social": "Maria Gonzalez Hernandez", "segundo_email": null, "fecha_registro": "2025-12-08T14:53:22.041494-06:00", "regimen_fiscal": "612", "nombre_comercial": "Maria Gonzalez Hernandez", "segundo_telefono": "9673456790", "direccion_entrega": "Real de Guadalupe 789, Centro, San Cristobal de las Casas, Chiapas", "fecha_modificacion": "2025-12-08T14:53:22.041494-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29200"}	\N	\N	2025-12-08 14:53:22.041494-06
4	clientes	INSERT	4	\N	{"id": 4, "rfc": "CSP180920E56", "email": "contacto@consultoresmaya.com", "activo": true, "telefono": "9612000005", "uso_cfdi": "G01", "razon_social": "Consultoria y Servicios Profesionales Maya S.C.", "segundo_email": null, "fecha_registro": "2025-12-08T14:53:22.041494-06:00", "regimen_fiscal": "612", "nombre_comercial": "Consultores Maya", "segundo_telefono": null, "direccion_entrega": "Av. Universidad, 321, Universitaria, Tuxtla Gutierrez, Chiapas", "fecha_modificacion": "2025-12-08T14:53:22.041494-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29050"}	\N	\N	2025-12-08 14:53:22.041494-06
5	clientes	INSERT	5	\N	{"id": 5, "rfc": "DCH170215G78", "email": "ventas@districhiapas.com", "activo": true, "telefono": "9612000007", "uso_cfdi": "G03", "razon_social": "Distribuidora de Chiapas S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-12-08T14:53:22.041494-06:00", "regimen_fiscal": "601", "nombre_comercial": "Distribuidora Chiapas", "segundo_telefono": null, "direccion_entrega": "Blvd. Los Castillos, 456, Las Flores, Tuxtla Gutierrez, Chiapas", "fecha_modificacion": "2025-12-08T14:53:22.041494-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29020"}	\N	\N	2025-12-08 14:53:22.041494-06
6	proveedores	INSERT	1	\N	{"id": 1, "rfc": "PES910315ABC", "email": "ventas@estudiantepapeleria.com", "notas": "Proveedor principal de papeleria y suministros de oficina", "activo": true, "telefono": "555-1001", "direccion": "Av. Universidad 123, Col. Centro, Ciudad de Mexico, CDMX, 06000, Mexico", "pagina_web": "www.papeleriaestudiante.com", "dias_credito": 30, "razon_social": "Papeleria El Estudiante S.A. de C.V.", "fecha_registro": "2023-01-10T00:00:00-06:00", "tipo_proveedor": "Productos", "cuenta_bancaria": "012345678901234567", "nombre_contacto": "Maria Gonzalez", "nombre_comercial": "Papeleria El Estudiante", "fecha_modificacion": "2025-12-08T14:53:22.053047-06:00", "metodo_pago_principal": "Transferencia"}	\N	\N	2025-12-08 14:53:22.053047-06
7	proveedores	INSERT	2	\N	{"id": 2, "rfc": "TYS850420DEF", "email": "soporte@tecnologiasistemas.com", "notas": "Mantenimiento de equipos de computo y redes", "activo": true, "telefono": "555-1002", "direccion": "Calle Tecnologia 456, Col. Moderna, Ciudad de Mexico, CDMX, 03100, Mexico", "pagina_web": "www.tecnologiaysistemas.com", "dias_credito": 15, "razon_social": "Tecnologia y Sistemas S.A. de C.V.", "fecha_registro": "2023-02-05T00:00:00-06:00", "tipo_proveedor": "Servicios", "cuenta_bancaria": null, "nombre_contacto": "Ing. Carlos Ramirez", "nombre_comercial": "Tecnologia y Sistemas", "fecha_modificacion": "2025-12-08T14:53:22.053047-06:00", "metodo_pago_principal": "Transferencia"}	\N	\N	2025-12-08 14:53:22.053047-06
8	proveedores	INSERT	3	\N	{"id": 3, "rfc": "SLI780630GHI", "email": "admin@limpiezaintegral.com", "notas": "Servicio de limpieza diario para oficinas", "activo": true, "telefono": "555-1003", "direccion": "Av. Servicios 789, Col. Industrial, Ciudad de Mexico, CDMX, 07300, Mexico", "pagina_web": null, "dias_credito": 0, "razon_social": "Servicios de Limpieza Integral S.A. de C.V.", "fecha_registro": "2023-03-12T00:00:00-06:00", "tipo_proveedor": "Servicios", "cuenta_bancaria": null, "nombre_contacto": "Patricia Herrera", "nombre_comercial": "Limpieza Integral", "fecha_modificacion": "2025-12-08T14:53:22.053047-06:00", "metodo_pago_principal": "Efectivo"}	\N	\N	2025-12-08 14:53:22.053047-06
9	proveedores	INSERT	4	\N	{"id": 4, "rfc": "ITE920815JKL", "email": "pedidos@tonersexpress.com", "notas": "Cartuchos, toners y consumibles para impresoras", "activo": true, "telefono": "555-1004", "direccion": "Blvd. Insumos 321, Col. Comercial, Ciudad de Mexico, CDMX, 06500, Mexico", "pagina_web": "www.tonersexpress.com", "dias_credito": 45, "razon_social": "Insumos y Toners Express S.A. de C.V.", "fecha_registro": "2023-04-18T00:00:00-06:00", "tipo_proveedor": "Productos", "cuenta_bancaria": "098765432109876543", "nombre_contacto": "Lic. Roberto Silva", "nombre_comercial": "Toners Express", "fecha_modificacion": "2025-12-08T14:53:22.053047-06:00", "metodo_pago_principal": "Transferencia"}	\N	\N	2025-12-08 14:53:22.053047-06
10	proveedores	INSERT	5	\N	{"id": 5, "rfc": "CEP870925MNO", "email": "cursos@capacitacionpro.com", "notas": "Cursos de desarrollo profesional y tecnico", "activo": true, "telefono": "555-1005", "direccion": "Av. Capacitacion 654, Col. Educativa, Ciudad de Mexico, CDMX, 03900, Mexico", "pagina_web": "www.capacitacionpro.com", "dias_credito": 0, "razon_social": "Capacitacion Empresarial Pro S.C.", "fecha_registro": "2023-05-22T00:00:00-06:00", "tipo_proveedor": "Servicios", "cuenta_bancaria": null, "nombre_contacto": "Mtra. Ana Lopez", "nombre_comercial": "Capacitacion Pro", "fecha_modificacion": "2025-12-08T14:53:22.053047-06:00", "metodo_pago_principal": "Transferencia"}	\N	\N	2025-12-08 14:53:22.053047-06
11	empleados	INSERT	1	\N	{"id": 1, "email": "roberto.martinez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Roberto Martinez Sanchez", "salario": 22000.00, "telefono": "961-100-1001", "puesto_id": 1, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "completo", "fecha_ingreso": "2020-01-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 15}	\N	\N	2025-12-08 14:53:22.059204-06
12	empleados	INSERT	2	\N	{"id": 2, "email": "laura.gomez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Laura Gomez Perez", "salario": 16000.00, "telefono": "961-100-1002", "puesto_id": 2, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2020-03-10", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
13	empleados	INSERT	3	\N	{"id": 3, "email": "carlos.hernandez@supercopias.com", "turno": "Vespertino", "activo": true, "nombre": "Carlos Hernandez Lopez", "salario": 15500.00, "telefono": "961-100-1003", "puesto_id": 2, "fecha_baja": null, "usuario_id": null, "sucursal_id": 2, "tipo_acceso": "limitado", "fecha_ingreso": "2021-06-01", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
14	empleados	INSERT	4	\N	{"id": 4, "email": "ana.ruiz@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Ana Maria Ruiz Torres", "salario": 13000.00, "telefono": "961-100-1004", "puesto_id": 3, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2021-09-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
15	empleados	INSERT	5	\N	{"id": 5, "email": "jorge.morales@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Jorge Luis Morales Garcia", "salario": 10500.00, "telefono": "961-100-1005", "puesto_id": 4, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "solo_lectura", "fecha_ingreso": "2022-01-20", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
16	empleados	INSERT	6	\N	{"id": 6, "email": "patricia.diaz@supercopias.com", "turno": "Vespertino", "activo": true, "nombre": "Patricia Diaz Ramirez", "salario": 10000.00, "telefono": "961-100-1006", "puesto_id": 4, "fecha_baja": null, "usuario_id": null, "sucursal_id": 2, "tipo_acceso": "solo_lectura", "fecha_ingreso": "2022-03-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
17	empleados	INSERT	7	\N	{"id": 7, "email": "miguel.chavez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Miguel Angel Chavez Cruz", "salario": 9500.00, "telefono": "961-100-1007", "puesto_id": 5, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "solo_lectura", "fecha_ingreso": "2022-07-01", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
18	empleados	INSERT	8	\N	{"id": 8, "email": "sandra.ortiz@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Sandra Elena Ortiz Mendez", "salario": 9000.00, "telefono": "961-100-1008", "puesto_id": 6, "fecha_baja": null, "usuario_id": null, "sucursal_id": 3, "tipo_acceso": "solo_lectura", "fecha_ingreso": "2023-02-10", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
19	empleados	INSERT	9	\N	{"id": 9, "email": "francisco.ramos@supercopias.com", "turno": "Vespertino", "activo": true, "nombre": "Francisco Javier Ramos Silva", "salario": 8500.00, "telefono": "961-100-1009", "puesto_id": 7, "fecha_baja": null, "usuario_id": null, "sucursal_id": 2, "tipo_acceso": "solo_lectura", "fecha_ingreso": "2023-05-22", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
20	empleados	INSERT	10	\N	{"id": 10, "email": "daniela.fernandez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Daniela Fernandez Vega", "salario": 11000.00, "telefono": "961-100-1010", "puesto_id": 8, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "solo_lectura", "fecha_ingreso": "2023-08-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.059204-06
21	usuarios	INSERT	2	\N	{"id": 2, "bio": "Gerente General - Administrador del sistema", "role": "admin", "email": "roberto.martinez@supercopias.com", "phone": "961-100-1001", "roles": ["admin"], "activo": true, "nombre": "Roberto Martinez", "password": "$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7", "username": "001.robertomar", "full_name": "Roberto Martinez Sanchez", "empleado_id": 1, "profile_image": null, "ultimo_acceso": null, "fecha_registro": "2025-12-08T14:53:22.065258-06:00", "fecha_modificacion": "2025-12-08T14:53:22.065258-06:00"}	\N	\N	2025-12-08 14:53:22.065258-06
22	usuarios	INSERT	3	\N	{"id": 3, "bio": "Gerente de Sucursal Principal - Acceso personalizado", "role": "empleado", "email": "laura.gomez@supercopias.com", "phone": "961-100-1002", "roles": ["empleado"], "activo": true, "nombre": "Laura Gomez", "password": "$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7", "username": "002.lauragomez", "full_name": "Laura Gomez Perez", "empleado_id": 2, "profile_image": null, "ultimo_acceso": null, "fecha_registro": "2025-12-08T14:53:22.0686-06:00", "fecha_modificacion": "2025-12-08T14:53:22.0686-06:00"}	\N	\N	2025-12-08 14:53:22.0686-06
23	usuarios	INSERT	4	\N	{"id": 4, "bio": "Gerente de Sucursal Norte - Acceso personalizado", "role": "empleado", "email": "carlos.hernandez@supercopias.com", "phone": "961-100-1003", "roles": ["empleado"], "activo": true, "nombre": "Carlos Hernandez", "password": "$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7", "username": "003.carloshern", "full_name": "Carlos Hernandez Lopez", "empleado_id": 3, "profile_image": null, "ultimo_acceso": null, "fecha_registro": "2025-12-08T14:53:22.069178-06:00", "fecha_modificacion": "2025-12-08T14:53:22.069178-06:00"}	\N	\N	2025-12-08 14:53:22.069178-06
24	usuarios	INSERT	5	\N	{"id": 5, "bio": "Supervisor - Acceso personalizado", "role": "empleado", "email": "ana.ruiz@supercopias.com", "phone": "961-100-1004", "roles": ["empleado"], "activo": true, "nombre": "Ana Maria Ruiz", "password": "$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7", "username": "004.anamariarui", "full_name": "Ana Maria Ruiz Torres", "empleado_id": 4, "profile_image": null, "ultimo_acceso": null, "fecha_registro": "2025-12-08T14:53:22.069517-06:00", "fecha_modificacion": "2025-12-08T14:53:22.069517-06:00"}	\N	\N	2025-12-08 14:53:22.069517-06
25	empleados	UPDATE	1	{"id": 1, "email": "roberto.martinez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Roberto Martinez Sanchez", "salario": 22000.00, "telefono": "961-100-1001", "puesto_id": 1, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "completo", "fecha_ingreso": "2020-01-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 15}	{"id": 1, "email": "roberto.martinez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Roberto Martinez Sanchez", "salario": 22000.00, "telefono": "961-100-1001", "puesto_id": 1, "fecha_baja": null, "usuario_id": 2, "sucursal_id": 1, "tipo_acceso": "completo", "fecha_ingreso": "2020-01-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.071229-06:00", "dias_vacaciones_sugeridos": 15}	\N	\N	2025-12-08 14:53:22.071229-06
26	empleados	UPDATE	2	{"id": 2, "email": "laura.gomez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Laura Gomez Perez", "salario": 16000.00, "telefono": "961-100-1002", "puesto_id": 2, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2020-03-10", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	{"id": 2, "email": "laura.gomez@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Laura Gomez Perez", "salario": 16000.00, "telefono": "961-100-1002", "puesto_id": 2, "fecha_baja": null, "usuario_id": 3, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2020-03-10", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.071743-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.071743-06
27	empleados	UPDATE	3	{"id": 3, "email": "carlos.hernandez@supercopias.com", "turno": "Vespertino", "activo": true, "nombre": "Carlos Hernandez Lopez", "salario": 15500.00, "telefono": "961-100-1003", "puesto_id": 2, "fecha_baja": null, "usuario_id": null, "sucursal_id": 2, "tipo_acceso": "limitado", "fecha_ingreso": "2021-06-01", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	{"id": 3, "email": "carlos.hernandez@supercopias.com", "turno": "Vespertino", "activo": true, "nombre": "Carlos Hernandez Lopez", "salario": 15500.00, "telefono": "961-100-1003", "puesto_id": 2, "fecha_baja": null, "usuario_id": 4, "sucursal_id": 2, "tipo_acceso": "limitado", "fecha_ingreso": "2021-06-01", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.071994-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.071994-06
28	empleados	UPDATE	4	{"id": 4, "email": "ana.ruiz@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Ana Maria Ruiz Torres", "salario": 13000.00, "telefono": "961-100-1004", "puesto_id": 3, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2021-09-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.059204-06:00", "dias_vacaciones_sugeridos": 12}	{"id": 4, "email": "ana.ruiz@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Ana Maria Ruiz Torres", "salario": 13000.00, "telefono": "961-100-1004", "puesto_id": 3, "fecha_baja": null, "usuario_id": 5, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2021-09-15", "fecha_registro": "2025-12-08T14:53:22.059204-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:53:22.072526-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:53:22.072526-06
29	empleados	INSERT	11	\N	{"id": 11, "email": "prueba@mail.com", "turno": "Matutino", "activo": true, "nombre": "Jhonatan Grajales", "salario": 10000.00, "telefono": "5544935853", "puesto_id": 6, "fecha_baja": null, "usuario_id": null, "sucursal_id": 2, "tipo_acceso": "limitado", "fecha_ingreso": "2025-12-08", "fecha_registro": "2025-12-08T14:57:23.895542-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:57:23.895542-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:57:23.895542-06
30	usuarios	INSERT	6	\N	{"id": 6, "bio": "Empleado - Acceso personalizado", "role": "empleado", "email": "prueba@mail.com", "phone": "5544935853", "roles": ["empleado"], "activo": true, "nombre": "Jhonatan Grajales", "password": "$2a$10$qGcrf./RnIHX8Y.nyXfHSeaimxYFOi6coFBIyHgXxi0TzsIA0dS6W", "username": "005.Jhonatan", "full_name": "Jhonatan Grajales", "empleado_id": 11, "profile_image": null, "ultimo_acceso": null, "fecha_registro": "2025-12-08T14:57:23.994707-06:00", "fecha_modificacion": "2025-12-08T14:57:23.994707-06:00"}	\N	\N	2025-12-08 14:57:23.994707-06
31	empleados	UPDATE	11	{"id": 11, "email": "prueba@mail.com", "turno": "Matutino", "activo": true, "nombre": "Jhonatan Grajales", "salario": 10000.00, "telefono": "5544935853", "puesto_id": 6, "fecha_baja": null, "usuario_id": null, "sucursal_id": 2, "tipo_acceso": "limitado", "fecha_ingreso": "2025-12-08", "fecha_registro": "2025-12-08T14:57:23.895542-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:57:23.895542-06:00", "dias_vacaciones_sugeridos": 12}	{"id": 11, "email": "prueba@mail.com", "turno": "Matutino", "activo": true, "nombre": "Jhonatan Grajales", "salario": 10000.00, "telefono": "5544935853", "puesto_id": 6, "fecha_baja": null, "usuario_id": 6, "sucursal_id": 2, "tipo_acceso": "limitado", "fecha_ingreso": "2025-12-08", "fecha_registro": "2025-12-08T14:57:23.895542-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-12-08T14:57:23.997384-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-12-08 14:57:23.997384-06
32	usuarios	UPDATE	6	{"id": 6, "bio": "Empleado - Acceso personalizado", "role": "empleado", "email": "prueba@mail.com", "phone": "5544935853", "roles": ["empleado"], "activo": true, "nombre": "Jhonatan Grajales", "password": "$2a$10$qGcrf./RnIHX8Y.nyXfHSeaimxYFOi6coFBIyHgXxi0TzsIA0dS6W", "username": "005.Jhonatan", "full_name": "Jhonatan Grajales", "empleado_id": 11, "profile_image": null, "ultimo_acceso": null, "fecha_registro": "2025-12-08T14:57:23.994707-06:00", "fecha_modificacion": "2025-12-08T14:57:23.994707-06:00"}	{"id": 6, "bio": "Empleado - Acceso personalizado", "role": "empleado", "email": "prueba@mail.com", "phone": "5544935853", "roles": ["empleado"], "activo": true, "nombre": "Jhonatan Grajales", "password": "$2a$10$qGcrf./RnIHX8Y.nyXfHSeaimxYFOi6coFBIyHgXxi0TzsIA0dS6W", "username": "005.Jhonatan", "full_name": "Jhonatan Grajales", "empleado_id": 11, "profile_image": null, "ultimo_acceso": "2025-12-08T14:58:15.442881-06:00", "fecha_registro": "2025-12-08T14:57:23.994707-06:00", "fecha_modificacion": "2025-12-08T14:58:15.442881-06:00"}	\N	\N	2025-12-08 14:58:15.442881-06
33	usuarios	UPDATE	6	{"id": 6, "bio": "Empleado - Acceso personalizado", "role": "empleado", "email": "prueba@mail.com", "phone": "5544935853", "roles": ["empleado"], "activo": true, "nombre": "Jhonatan Grajales", "password": "$2a$10$qGcrf./RnIHX8Y.nyXfHSeaimxYFOi6coFBIyHgXxi0TzsIA0dS6W", "username": "005.Jhonatan", "full_name": "Jhonatan Grajales", "empleado_id": 11, "profile_image": null, "ultimo_acceso": "2025-12-08T14:58:15.442881-06:00", "fecha_registro": "2025-12-08T14:57:23.994707-06:00", "fecha_modificacion": "2025-12-08T14:58:15.442881-06:00"}	{"id": 6, "bio": "Empleado - Acceso personalizado", "role": "empleado", "email": "prueba@mail.com", "phone": "5544935853", "roles": ["empleado"], "activo": true, "nombre": "Jhonatan Grajales", "password": "$2a$08$le4AuouGc8R..iU2/oYMi.qxvurNC9wycnVKwsjj6aG1hu/DpYW7u", "username": "005.Jhonatan", "full_name": "Jhonatan Grajales", "empleado_id": 11, "profile_image": null, "ultimo_acceso": "2025-12-08T14:58:15.442881-06:00", "fecha_registro": "2025-12-08T14:57:23.994707-06:00", "fecha_modificacion": "2025-12-08T14:59:03.654714-06:00"}	\N	\N	2025-12-08 14:59:03.654714-06
34	usuarios	UPDATE	6	{"id": 6, "bio": "Empleado - Acceso personalizado", "role": "empleado", "email": "prueba@mail.com", "phone": "5544935853", "roles": ["empleado"], "activo": true, "nombre": "Jhonatan Grajales", "password": "$2a$08$le4AuouGc8R..iU2/oYMi.qxvurNC9wycnVKwsjj6aG1hu/DpYW7u", "username": "005.Jhonatan", "full_name": "Jhonatan Grajales", "empleado_id": 11, "profile_image": null, "ultimo_acceso": "2025-12-08T14:58:15.442881-06:00", "fecha_registro": "2025-12-08T14:57:23.994707-06:00", "fecha_modificacion": "2025-12-08T14:59:03.654714-06:00"}	{"id": 6, "bio": "Empleado - Acceso personalizado", "role": "empleado", "email": "prueba@mail.com", "phone": "5544935853", "roles": ["empleado"], "activo": true, "nombre": "Jhonatan Grajales", "password": "$2a$08$le4AuouGc8R..iU2/oYMi.qxvurNC9wycnVKwsjj6aG1hu/DpYW7u", "username": "005.Jhonatan", "full_name": "Jhonatan Grajales", "empleado_id": 11, "profile_image": null, "ultimo_acceso": "2025-12-08T14:59:41.100037-06:00", "fecha_registro": "2025-12-08T14:57:23.994707-06:00", "fecha_modificacion": "2025-12-08T14:59:41.100037-06:00"}	\N	\N	2025-12-08 14:59:41.100037-06
35	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2025-10-12T00:09:08.738514-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2025-10-12T00:09:08.738514-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2025-12-08T15:00:22.392569-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2025-12-08T15:00:22.392569-06:00"}	\N	\N	2025-12-08 15:00:22.392569-06
36	proveedores	UPDATE	5	{"id": 5, "rfc": "CEP870925MNO", "email": "cursos@capacitacionpro.com", "notas": "Cursos de desarrollo profesional y tecnico", "activo": true, "telefono": "555-1005", "direccion": "Av. Capacitacion 654, Col. Educativa, Ciudad de Mexico, CDMX, 03900, Mexico", "pagina_web": "www.capacitacionpro.com", "dias_credito": 0, "razon_social": "Capacitacion Empresarial Pro S.C.", "fecha_registro": "2023-05-22T00:00:00-06:00", "tipo_proveedor": "Servicios", "cuenta_bancaria": null, "nombre_contacto": "Mtra. Ana Lopez", "nombre_comercial": "Capacitacion Pro", "fecha_modificacion": "2025-12-08T14:53:22.053047-06:00", "metodo_pago_principal": "Transferencia"}	{"id": 5, "rfc": "CEP870925MNO", "email": "cursos@capacitacionpro.com", "notas": "Cursos de desarrollo profesional y tecnico", "activo": true, "telefono": "555-1005", "direccion": "Av. Capacitacion 654, Col. Educativa, Ciudad de Mexico, CDMX, 03900, Mexico", "pagina_web": "www.capacitacionpro.com", "dias_credito": 15, "razon_social": "Capacitacion Empresarial Pro S.C.", "fecha_registro": "2023-05-22T00:00:00-06:00", "tipo_proveedor": "Servicios", "cuenta_bancaria": "098765432109876543", "nombre_contacto": "Mtra. Ana Lopez", "nombre_comercial": "Capacitacion Pro", "fecha_modificacion": "2025-12-08T15:01:08.783671-06:00", "metodo_pago_principal": "Transferencia"}	\N	\N	2025-12-08 15:01:08.783671-06
37	proveedores	INSERT	6	\N	{"id": 6, "rfc": "CLS920810XYZ", "email": "buit_99@hotmail.com", "notas": "nota de prueba", "activo": true, "telefono": "9612345678", "direccion": "AV MACTUMATZA LTE 5 MZN 35", "pagina_web": "www.tonersexpress.com", "dias_credito": 0, "razon_social": "comercializadora de pruebas", "fecha_registro": "2025-12-08T15:03:33.788913-06:00", "tipo_proveedor": "Mixto", "cuenta_bancaria": null, "nombre_contacto": "Jhonatan Grajales", "nombre_comercial": "Proveedor de prueba", "fecha_modificacion": "2025-12-08T15:03:33.788913-06:00", "metodo_pago_principal": "Cheque"}	\N	\N	2025-12-08 15:03:33.788913-06
38	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2025-12-08T15:00:22.392569-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2025-12-08T15:00:22.392569-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T17:56:45.988068-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T17:56:45.988068-06:00"}	\N	\N	2026-03-07 17:56:45.988068-06
39	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T17:56:45.988068-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T17:56:45.988068-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T19:54:36.634273-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T19:54:36.634273-06:00"}	\N	\N	2026-03-07 19:54:36.634273-06
40	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T19:54:36.634273-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T19:54:36.634273-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T20:05:29.781013-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T20:05:29.781013-06:00"}	\N	\N	2026-03-07 20:05:29.781013-06
41	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T20:05:29.781013-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T20:05:29.781013-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T20:18:26.515183-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T20:18:26.515183-06:00"}	\N	\N	2026-03-07 20:18:26.515183-06
42	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T20:18:26.515183-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T20:18:26.515183-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T20:29:01.882881-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T20:29:01.882881-06:00"}	\N	\N	2026-03-07 20:29:01.882881-06
43	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T20:29:01.882881-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T20:29:01.882881-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": null, "ultimo_acceso": "2026-03-07T21:02:13.287223-06:00", "fecha_registro": "2025-10-12T00:09:08.738514-06:00", "fecha_modificacion": "2026-03-07T21:02:13.287223-06:00"}	\N	\N	2026-03-07 21:02:13.287223-06
\.


--
-- Data for Name: cat_estatus_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cat_estatus_equipo (id, codigo, nombre, descripcion, color, activo, orden, fecha_creacion) FROM stdin;
1	activo	Activo	Equipo en operación normal	success	t	1	2025-11-30 12:00:00-06
2	inactivo	Inactivo	Equipo temporalmente sin uso	secondary	t	2	2025-11-30 12:00:00-06
3	en_reparacion	En Reparación	Equipo en proceso de reparación	warning	t	3	2025-11-30 12:00:00-06
4	baja	Dado de Baja	Equipo fuera de servicio permanente	danger	t	4	2025-11-30 12:00:00-06
\.


--
-- Data for Name: cat_marcas_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cat_marcas_equipo (id, nombre, descripcion, activo, orden, fecha_creacion) FROM stdin;
1	HP	Hewlett-Packard	t	1	2025-11-30 12:00:00-06
2	Canon	Canon Inc.	t	2	2025-11-30 12:00:00-06
3	Epson	Epson Corporation	t	3	2025-11-30 12:00:00-06
4	Xerox	Xerox Corporation	t	4	2025-11-30 12:00:00-06
5	Brother	Brother Industries	t	5	2025-11-30 12:00:00-06
6	Ricoh	Ricoh Company	t	6	2025-11-30 12:00:00-06
7	Kyocera	Kyocera Document Solutions	t	7	2025-11-30 12:00:00-06
8	Samsung	Samsung Electronics	t	8	2025-11-30 12:00:00-06
9	Dell	Dell Technologies	t	9	2025-11-30 12:00:00-06
10	Lenovo	Lenovo Group	t	10	2025-11-30 12:00:00-06
11	Acer	Acer Inc.	t	11	2025-11-30 12:00:00-06
12	Asus	ASUSTeK Computer	t	12	2025-11-30 12:00:00-06
13	Toshiba	Toshiba Corporation	t	13	2025-11-30 12:00:00-06
14	LG	LG Electronics	t	14	2025-11-30 12:00:00-06
15	Cisco	Cisco Systems	t	15	2025-11-30 12:00:00-06
16	TP-Link	TP-Link Technologies	t	16	2025-11-30 12:00:00-06
17	Otra	Otra marca	t	99	2025-11-30 12:00:00-06
\.


--
-- Data for Name: cat_metodos_pago_proveedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cat_metodos_pago_proveedor (id, clave, descripcion, orden, activo, fecha_creacion, fecha_modificacion) FROM stdin;
1	EFECTIVO	Efectivo	1	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
2	TRANSFERENCIA	Transferencia bancaria	2	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
3	CHEQUE	Cheque	3	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
4	TARJETA_CREDITO	Tarjeta de crédito	4	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
5	TARJETA_DEBITO	Tarjeta de débito	5	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
6	OTRO	Otro	6	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
\.


--
-- Data for Name: cat_tipos_equipo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cat_tipos_equipo (id, codigo, nombre, descripcion, icono, requiere_contador, activo, orden, fecha_creacion) FROM stdin;
1	fotocopiadora	Fotocopiadora	Equipos multifuncionales para impresiÃ³n, copia y escaneo	fa-copy	t	t	1	2025-11-30 12:00:00-06
2	impresora	Impresora	Impresoras lÃ¡ser, inkjet y matriciales	fa-print	t	t	2	2025-11-30 12:00:00-06
3	pc	PC de Escritorio	Computadoras de escritorio	fa-desktop	f	t	3	2025-11-30 12:00:00-06
4	laptop	Laptop	Computadoras portÃ¡tiles	fa-laptop	f	t	4	2025-11-30 12:00:00-06
5	monitor	Monitor	Pantallas y monitores	fa-tv	f	t	5	2025-11-30 12:00:00-06
6	router	Router	Equipos de red y conectividad	fa-network-wired	f	t	6	2025-11-30 12:00:00-06
7	escaner	EscÃ¡ner	EscÃ¡neres independientes	fa-scanner	f	t	7	2025-11-30 12:00:00-06
8	otro	Otro Equipo	Otros equipos electrÃ³nicos	fa-laptop-medical	f	t	8	2025-11-30 12:00:00-06
\.


--
-- Data for Name: cat_tipos_proveedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cat_tipos_proveedor (id, clave, descripcion, orden, activo, fecha_creacion, fecha_modificacion) FROM stdin;
1	PRODUCTOS	Productos	1	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
2	SERVICIOS	Servicios	2	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
3	MIXTO	Mixto	3	t	2025-11-29 00:00:00-06	2025-11-29 00:00:00-06
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clientes (id, rfc, razon_social, nombre_comercial, email, telefono, direccion_codigo_postal, regimen_fiscal, uso_cfdi, activo, fecha_registro, fecha_modificacion, direccion_entrega, direccion_facturacion, segundo_telefono, segundo_email) FROM stdin;
1	PEGJ850315ABC	Juan Perez Garcia	Juan Perez Garcia	juan.perez@email.com	9611234567	29000	612	G03	t	2025-12-08 14:53:22.041494-06	2025-12-08 14:53:22.041494-06	Av. Central 123, Col. Centro, Tuxtla Gutierrez, Chiapas	\N	9611234568	\N
2	CLS920810XYZ	Comercializadora Lopez S.A. de C.V.	Comercializadora Lopez S.A. de C.V.	ventas@comlopez.com	9612345678	29030	601	G01	t	2025-12-08 14:53:22.041494-06	2025-12-08 14:53:22.041494-06	Blvd. Belisario Dominguez 456, Col. Moctezuma, Tuxtla Gutierrez, Chiapas	\N	\N	\N
3	GOHM750425DEF	Maria Gonzalez Hernandez	Maria Gonzalez Hernandez	maria.gonzalez@email.com	9673456789	29200	612	G03	t	2025-12-08 14:53:22.041494-06	2025-12-08 14:53:22.041494-06	Real de Guadalupe 789, Centro, San Cristobal de las Casas, Chiapas	\N	9673456790	\N
4	CSP180920E56	Consultoria y Servicios Profesionales Maya S.C.	Consultores Maya	contacto@consultoresmaya.com	9612000005	29050	612	G01	t	2025-12-08 14:53:22.041494-06	2025-12-08 14:53:22.041494-06	Av. Universidad, 321, Universitaria, Tuxtla Gutierrez, Chiapas	\N	\N	\N
5	DCH170215G78	Distribuidora de Chiapas S.A. de C.V.	Distribuidora Chiapas	ventas@districhiapas.com	9612000007	29020	601	G03	t	2025-12-08 14:53:22.041494-06	2025-12-08 14:53:22.041494-06	Blvd. Los Castillos, 456, Las Flores, Tuxtla Gutierrez, Chiapas	\N	\N	\N
\.


--
-- Data for Name: empleados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empleados (id, nombre, email, telefono, puesto_id, sucursal_id, salario, fecha_ingreso, activo, fecha_baja, fecha_registro, fecha_modificacion, tipo_acceso, usuario_id, dias_vacaciones_sugeridos, notas_vacaciones, turno) FROM stdin;
5	Jorge Luis Morales Garcia	jorge.morales@supercopias.com	961-100-1005	4	1	10500.00	2022-01-20	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.059204-06	solo_lectura	\N	12	\N	Matutino
6	Patricia Diaz Ramirez	patricia.diaz@supercopias.com	961-100-1006	4	2	10000.00	2022-03-15	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.059204-06	solo_lectura	\N	12	\N	Vespertino
7	Miguel Angel Chavez Cruz	miguel.chavez@supercopias.com	961-100-1007	5	1	9500.00	2022-07-01	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.059204-06	solo_lectura	\N	12	\N	Matutino
8	Sandra Elena Ortiz Mendez	sandra.ortiz@supercopias.com	961-100-1008	6	3	9000.00	2023-02-10	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.059204-06	solo_lectura	\N	12	\N	Matutino
9	Francisco Javier Ramos Silva	francisco.ramos@supercopias.com	961-100-1009	7	2	8500.00	2023-05-22	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.059204-06	solo_lectura	\N	12	\N	Vespertino
10	Daniela Fernandez Vega	daniela.fernandez@supercopias.com	961-100-1010	8	1	11000.00	2023-08-15	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.059204-06	solo_lectura	\N	12	\N	Matutino
1	Roberto Martinez Sanchez	roberto.martinez@supercopias.com	961-100-1001	1	1	22000.00	2020-01-15	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.071229-06	completo	2	15	\N	Matutino
2	Laura Gomez Perez	laura.gomez@supercopias.com	961-100-1002	2	1	16000.00	2020-03-10	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.071743-06	limitado	3	12	\N	Matutino
3	Carlos Hernandez Lopez	carlos.hernandez@supercopias.com	961-100-1003	2	2	15500.00	2021-06-01	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.071994-06	limitado	4	12	\N	Vespertino
4	Ana Maria Ruiz Torres	ana.ruiz@supercopias.com	961-100-1004	3	1	13000.00	2021-09-15	t	\N	2025-12-08 14:53:22.059204-06	2025-12-08 14:53:22.072526-06	limitado	5	12	\N	Matutino
11	Jhonatan Grajales	prueba@mail.com	5544935853	6	2	10000.00	2025-12-08	t	\N	2025-12-08 14:57:23.895542-06	2025-12-08 14:57:23.997384-06	limitado	6	12	\N	Matutino
\.


--
-- Data for Name: empleados_modulos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empleados_modulos (id, empleado_id, modulo, acceso, fecha_asignacion) FROM stdin;
1	2	empleados	t	2025-12-08 14:53:22.0698-06
2	2	clientes	t	2025-12-08 14:53:22.0698-06
3	2	reportes	t	2025-12-08 14:53:22.0698-06
4	3	empleados	t	2025-12-08 14:53:22.070726-06
5	3	clientes	t	2025-12-08 14:53:22.070726-06
6	3	inventarios	t	2025-12-08 14:53:22.070726-06
7	3	reportes	t	2025-12-08 14:53:22.070726-06
8	4	clientes	t	2025-12-08 14:53:22.070997-06
9	4	inventarios	t	2025-12-08 14:53:22.070997-06
10	4	equipos	t	2025-12-08 14:53:22.070997-06
11	11	empleados	t	2025-12-08 14:57:23.903319-06
12	11	clientes	t	2025-12-08 14:57:23.904321-06
13	11	reportes	t	2025-12-08 14:57:23.904664-06
\.


--
-- Data for Name: equipos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipos (id, tipo_equipo, marca, modelo, numero_serie, nombre_equipo, area_ubicacion, cliente_nombre, estatus, responsable_nombre, observaciones, foto_url, fecha_alta, fecha_modificacion, activo, mantenimiento_intervalo_dias, mantenimiento_fecha_inicio, mantenimiento_dias_alerta) FROM stdin;
2	impresora	HP	LaserJet Pro M404dn	HPM404-045-2023	Impresora Oficina 1	Oficina Administrativa	\N	activo	Maria Lopez	Impresora para documentos administrativos	\N	2025-12-08 14:53:22.057877-06	2025-12-08 14:53:22.057877-06	t	120	2024-02-01	7
3	pc	Dell	OptiPlex 7090	DELL7090-123	PC Recepcion	Recepcion	\N	activo	Carlos Ramirez	Equipo de atencion al cliente	\N	2025-12-08 14:53:22.057877-06	2025-12-08 14:53:22.057877-06	t	\N	\N	7
4	laptop	Lenovo	ThinkPad E14	LNVE14-789	Laptop Gerencia	Gerencia	\N	activo	Ana Martinez	Equipo movil para gerencia	\N	2025-12-08 14:53:22.057877-06	2025-12-08 14:53:22.057877-06	t	\N	\N	7
5	router	TP-Link	Archer AX50	TPAX50-456	Router Principal	Sala de Servidores	\N	activo	Luis Gomez	Router principal de red empresarial	\N	2025-12-08 14:53:22.057877-06	2025-12-08 14:53:22.057877-06	t	180	2024-03-01	7
1	fotocopiadora	Canon	imageRUNNER 2525i	CNR2525-001-2023	Copiadora Principal	Area de Produccion	\N	activo	Juan Perez	Equipo principal para volumen alto de copias	\N	2025-12-08 14:53:22.057877-06	2025-12-08 15:26:28.111047-06	f	90	2024-01-15	7
6	fotocopiadora	Epson	\N	\N	Copiadora de prueba	5ta norte	\N	activo	Jhonatan Grajales	prueba nueva fotocopiadora	\N	2025-12-08 15:28:17.946976-06	2025-12-08 15:29:40.32967-06	t	10	2025-11-01	7
\.


--
-- Data for Name: equipos_caracteristicas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipos_caracteristicas (id, equipo_id, caracteristicas, fecha_creacion, fecha_modificacion) FROM stdin;
1	6	{"ram": "", "procesador": "", "resolucion": "", "tipo_panel": "", "direccion_ip": "", "almacenamiento": "", "contador_actual": 1000, "tamano_pulgadas": null, "tipo_consumible": "Toner", "rendimiento_toner": 10000, "sistema_operativo": "", "capacidad_bandejas": "500"}	2025-12-08 15:28:17.949992-06	2025-12-08 15:28:17.949992-06
\.


--
-- Data for Name: equipos_consumibles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipos_consumibles (id, equipo_id, tipo_consumible, fecha_instalacion, rendimiento_estimado, contador_instalacion, contador_proximo_cambio, observaciones) FROM stdin;
\.


--
-- Data for Name: equipos_historial_contador; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipos_historial_contador (id, equipo_id, fecha_lectura, contador_actual, tecnico_nombre, observaciones) FROM stdin;
1	6	2025-12-08 15:29:00.006527-06	1200	\N	ultima actualización
\.


--
-- Data for Name: equipos_mantenimiento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipos_mantenimiento (id, equipo_id, fecha_servicio, contador_servicio, descripcion, costo, tecnico_nombre, proveedor_nombre, observaciones) FROM stdin;
1	6	2025-12-08 16:06:01.479866-06	1500	Se agrega servicio de prueba	2000.00	\N	\N	prueba
\.


--
-- Data for Name: estados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estados (id, codigo, nombre, activo, fecha_creacion) FROM stdin;
1	AGU	Aguascalientes	t	2025-10-11 23:12:28.251575-06
2	BCN	Baja California	t	2025-10-11 23:12:28.25423-06
3	BCS	Baja California Sur	t	2025-10-11 23:12:28.254726-06
4	CAM	Campeche	t	2025-10-11 23:12:28.25509-06
5	CHP	Chiapas	t	2025-10-11 23:12:28.255518-06
6	CHH	Chihuahua	t	2025-10-11 23:12:28.255906-06
7	CMX	Ciudad de México	t	2025-10-11 23:12:28.256365-06
8	COA	Coahuila	t	2025-10-11 23:12:28.256719-06
9	COL	Colima	t	2025-10-11 23:12:28.257117-06
10	DUR	Durango	t	2025-10-11 23:12:28.257457-06
11	MEX	Estado de México	t	2025-10-11 23:12:28.25775-06
12	GUA	Guanajuato	t	2025-10-11 23:12:28.258022-06
13	GRO	Guerrero	t	2025-10-11 23:12:28.258374-06
14	HID	Hidalgo	t	2025-10-11 23:12:28.258653-06
15	JAL	Jalisco	t	2025-10-11 23:12:28.258915-06
16	MIC	Michoacán	t	2025-10-11 23:12:28.259192-06
17	MOR	Morelos	t	2025-10-11 23:12:28.259478-06
18	NAY	Nayarit	t	2025-10-11 23:12:28.259742-06
19	NLE	Nuevo León	t	2025-10-11 23:12:28.260003-06
20	OAX	Oaxaca	t	2025-10-11 23:12:28.260275-06
21	PUE	Puebla	t	2025-10-11 23:12:28.260537-06
22	QUE	Querétaro	t	2025-10-11 23:12:28.260835-06
23	ROO	Quintana Roo	t	2025-10-11 23:12:28.261167-06
24	SLP	San Luis Potosí	t	2025-10-11 23:12:28.261488-06
25	SIN	Sinaloa	t	2025-10-11 23:12:28.261811-06
26	SON	Sonora	t	2025-10-11 23:12:28.262132-06
27	TAB	Tabasco	t	2025-10-11 23:12:28.26244-06
28	TAM	Tamaulipas	t	2025-10-11 23:12:28.262714-06
29	TLA	Tlaxcala	t	2025-10-11 23:12:28.262975-06
30	VER	Veracruz	t	2025-10-11 23:12:28.263237-06
31	YUC	Yucat├ín	t	2025-10-11 23:12:28.263502-06
32	ZAC	Zacatecas	t	2025-10-11 23:12:28.263967-06
\.


--
-- Data for Name: eventos_personal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.eventos_personal (id, empleado_id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, horas_totales, dias_totales, subtipo, estado, justificada, con_goce_sueldo, motivo, observaciones, documento_url, registrado_por, aprobado_por, fecha_registro, fecha_aprobacion, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: formas_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.formas_pago (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	01	Efectivo	t	2025-10-11 23:12:28.279051-06
2	02	Cheque nominativo	t	2025-10-11 23:12:28.280649-06
3	03	Transferencia electrónica de fondos	t	2025-10-11 23:12:28.280916-06
4	04	Tarjeta de crédito	t	2025-10-11 23:12:28.281169-06
5	05	Monedero electrónico	t	2025-10-11 23:12:28.281417-06
6	06	Dinero electrónico	t	2025-10-11 23:12:28.281718-06
7	08	Vales de despensa	t	2025-10-11 23:12:28.282009-06
8	12	Dación en pago	t	2025-10-11 23:12:28.282325-06
9	13	Pago por subrogación	t	2025-10-11 23:12:28.282589-06
10	14	Pago por consignación	t	2025-10-11 23:12:28.282894-06
11	15	Condonación	t	2025-10-11 23:12:28.283165-06
12	17	Compensación	t	2025-10-11 23:12:28.283415-06
13	23	Novación	t	2025-10-11 23:12:28.283663-06
14	24	Confusión	t	2025-10-11 23:12:28.283985-06
15	25	Remisión de deuda	t	2025-10-11 23:12:28.284295-06
16	26	Prescripción o caducidad	t	2025-10-11 23:12:28.284574-06
17	27	A satisfacción del acreedor	t	2025-10-11 23:12:28.284831-06
18	28	Tarjeta de débito	t	2025-10-11 23:12:28.28508-06
19	29	Tarjeta de servicios	t	2025-10-11 23:12:28.285327-06
20	30	Aplicación de anticipos	t	2025-10-11 23:12:28.285579-06
21	31	Intermediario pagos	t	2025-10-11 23:12:28.285824-06
22	99	Por definir	t	2025-10-11 23:12:28.286069-06
\.


--
-- Data for Name: inv_departamentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inv_departamentos (id, nombre, descripcion, color, orden, activo, fecha_creacion, fecha_modificacion) FROM stdin;
1	Lapicero	Lapicero BIC	#6c757d	1	t	2026-03-07 19:04:00.742099-06	2026-03-07 19:04:00.742099-06
2	Papel	Papel por paquete	#6c757d	1	t	2026-03-07 19:04:00.742099-06	2026-03-07 19:04:00.742099-06
3	Arillos	\N	#dc3545	2	t	2026-03-07 19:57:03.676671-06	2026-03-07 19:57:03.676671-06
\.


--
-- Data for Name: inventarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventarios (id, tipo, nombre, categoria, marca, modelo, codigo_sku, proveedor_id, proveedor_nombre, estatus, existencia_actual, unidad_medida, stock_minimo, stock_maximo, ubicacion_fisica, costo_compra, precio_venta, costo_promedio, observaciones, foto_url, fecha_alta, fecha_modificacion, activo, departamento_id, es_servicio, disponible_en_pos, descripcion) FROM stdin;
6	venta	Lapicero	Lapicero	BIC	0.5	\N	6	\N	activo	10.00	pieza	5.00	20.00	5ta norte	10.00	15.00	10.00	\N	\N	2025-12-08 15:10:55.981505-06	2025-12-08 15:10:55.981505-06	t	1	f	t	\N
7	insumo	Papel	Papel	\N	\N	\N	1	\N	activo	3.00	paquete	4.00	\N	5ta norte	500.00	\N	500.00	\N	\N	2025-12-08 15:14:37.983548-06	2025-12-08 15:44:27.648355-06	t	2	f	f	\N
13	venta	Arillo no10	Arillos	BIC	\N	12	\N	\N	activo	5.00	Pieza	10.00	30.00	5ta norte	5.00	7.00	5.00	\N	\N	2026-03-07 20:19:55.044973-06	2026-03-07 20:29:23.866749-06	t	3	f	t	\N
\.


--
-- Data for Name: inventarios_movimientos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventarios_movimientos (id, inventario_id, tipo_movimiento, concepto, cantidad, saldo_anterior, saldo_nuevo, usuario_nombre, area_servicio, notas, evidencia_url, fecha_movimiento) FROM stdin;
1	6	entrada	ajuste_entrada	10.00	0.00	10.00	admin	\N	Existencia inicial al crear artículo	\N	2025-12-08 15:10:55.989819-06
2	7	entrada	ajuste_entrada	10.00	0.00	10.00	admin	\N	Existencia inicial al crear artículo	\N	2025-12-08 15:14:37.98786-06
3	7	salida	uso_operativo	-5.00	10.00	5.00	admin	\N	prueba salida operativa	\N	2025-12-08 15:17:00.881268-06
4	7	salida	venta	-2.00	5.00	3.00	admin	\N	salida venta	\N	2025-12-08 15:18:31.834647-06
5	7	entrada	compra	2.00	3.00	5.00	admin	\N	entrada compra 2	\N	2025-12-08 15:19:17.419268-06
6	7	salida	ajuste_salida	-2.00	5.00	3.00	admin	\N	\N	\N	2025-12-08 15:44:27.646284-06
7	13	entrada	ajuste_entrada	5.00	0.00	5.00	admin	\N	Existencia inicial al crear artículo	\N	2026-03-07 20:19:55.048244-06
\.


--
-- Data for Name: metodos_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.metodos_pago (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	PUE	Pago en una sola exhibición	t	2025-10-11 23:12:28.286448-06
2	PPD	Pago en parcialidades o diferido	t	2025-10-11 23:12:28.287972-06
\.


--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.modulos (id, clave, nombre, icono, activo, orden, fecha_creacion) FROM stdin;
1	dashboard	Dashboard	fas fa-tachometer-alt	t	1	2025-12-08 00:00:00-06
2	empleados	Empleados	fas fa-users	t	2	2025-12-08 00:00:00-06
3	clientes	Clientes	fas fa-user-tie	t	3	2025-12-08 00:00:00-06
4	proveedores	Proveedores	fas fa-truck	t	4	2025-12-08 00:00:00-06
5	inventarios	Inventarios	fas fa-boxes	t	5	2025-12-08 00:00:00-06
6	punto_venta	Punto de Venta	fas fa-cash-register	t	6	2025-12-08 00:00:00-06
7	equipos	Equipos	fas fa-desktop	t	7	2025-12-08 00:00:00-06
8	reportes	Reportes	fas fa-chart-bar	t	8	2025-12-08 00:00:00-06
9	facturacion	Facturación	fas fa-file-invoice	t	9	2026-04-20 00:00:00-06
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proveedores (id, nombre_comercial, razon_social, rfc, tipo_proveedor, activo, nombre_contacto, telefono, email, pagina_web, direccion, metodo_pago_principal, cuenta_bancaria, dias_credito, notas, fecha_registro, fecha_modificacion) FROM stdin;
1	Papeleria El Estudiante	Papeleria El Estudiante S.A. de C.V.	PES910315ABC	Productos	t	Maria Gonzalez	555-1001	ventas@estudiantepapeleria.com	www.papeleriaestudiante.com	Av. Universidad 123, Col. Centro, Ciudad de Mexico, CDMX, 06000, Mexico	Transferencia	012345678901234567	30	Proveedor principal de papeleria y suministros de oficina	2023-01-10 00:00:00-06	2025-12-08 14:53:22.053047-06
2	Tecnologia y Sistemas	Tecnologia y Sistemas S.A. de C.V.	TYS850420DEF	Servicios	t	Ing. Carlos Ramirez	555-1002	soporte@tecnologiasistemas.com	www.tecnologiaysistemas.com	Calle Tecnologia 456, Col. Moderna, Ciudad de Mexico, CDMX, 03100, Mexico	Transferencia	\N	15	Mantenimiento de equipos de computo y redes	2023-02-05 00:00:00-06	2025-12-08 14:53:22.053047-06
3	Limpieza Integral	Servicios de Limpieza Integral S.A. de C.V.	SLI780630GHI	Servicios	t	Patricia Herrera	555-1003	admin@limpiezaintegral.com	\N	Av. Servicios 789, Col. Industrial, Ciudad de Mexico, CDMX, 07300, Mexico	Efectivo	\N	0	Servicio de limpieza diario para oficinas	2023-03-12 00:00:00-06	2025-12-08 14:53:22.053047-06
4	Toners Express	Insumos y Toners Express S.A. de C.V.	ITE920815JKL	Productos	t	Lic. Roberto Silva	555-1004	pedidos@tonersexpress.com	www.tonersexpress.com	Blvd. Insumos 321, Col. Comercial, Ciudad de Mexico, CDMX, 06500, Mexico	Transferencia	098765432109876543	45	Cartuchos, toners y consumibles para impresoras	2023-04-18 00:00:00-06	2025-12-08 14:53:22.053047-06
5	Capacitacion Pro	Capacitacion Empresarial Pro S.C.	CEP870925MNO	Servicios	t	Mtra. Ana Lopez	555-1005	cursos@capacitacionpro.com	www.capacitacionpro.com	Av. Capacitacion 654, Col. Educativa, Ciudad de Mexico, CDMX, 03900, Mexico	Transferencia	098765432109876543	15	Cursos de desarrollo profesional y tecnico	2023-05-22 00:00:00-06	2025-12-08 15:01:08.783671-06
6	Proveedor de prueba	comercializadora de pruebas	CLS920810XYZ	Mixto	t	Jhonatan Grajales	9612345678	buit_99@hotmail.com	www.tonersexpress.com	AV MACTUMATZA LTE 5 MZN 35	Cheque	\N	0	nota de prueba	2025-12-08 15:03:33.788913-06	2025-12-08 15:03:33.788913-06
\.


--
-- Data for Name: puestos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puestos (id, nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion, fecha_modificacion) FROM stdin;
1	Gerente General	Responsable de la operación general	15000.00	25000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
2	Gerente de Sucursal	Responsable de la administración de la sucursal	12000.00	18000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
3	Supervisor	Supervisión de operaciones diarias	10000.00	15000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
4	Empleado de Mostrador	Atención directa al cliente	8000.00	12000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
5	Cajero	Manejo de caja y cobros	7500.00	11000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
6	Asistente de Ventas	Apoyo en atención al cliente y ventas	7000.00	10000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
7	Auxiliar Administrativo	Apoyo en tareas administrativas y de oficina	7000.00	10000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
8	Operador de Equipos	Manejo y mantenimiento de equipos de copiado e impresión	8000.00	12000.00	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
\.


--
-- Data for Name: regimenes_fiscales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.regimenes_fiscales (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	601	General de Ley Personas Morales	t	2025-10-11 23:12:28.2644-06
2	603	Personas Morales con Fines no Lucrativos	t	2025-10-11 23:12:28.266054-06
3	605	Sueldos y Salarios e Ingresos Asimilados a Salarios	t	2025-10-11 23:12:28.266326-06
4	606	Arrendamiento	t	2025-10-11 23:12:28.266582-06
5	607	Régimen de Enajenación o Adquisición de Bienes	t	2025-10-11 23:12:28.266836-06
6	608	Demás ingresos	t	2025-10-11 23:12:28.267085-06
7	610	Residentes en el Extranjero sin Establecimiento Permanente en México	t	2025-10-11 23:12:28.267334-06
8	611	Ingresos por Dividendos (socios y accionistas)	t	2025-10-11 23:12:28.267579-06
9	612	Personas Físicas con Actividades Empresariales y Profesionales	t	2025-10-11 23:12:28.267843-06
10	614	Ingresos por intereses	t	2025-10-11 23:12:28.268118-06
11	615	Régimen de los ingresos por obtención de premios	t	2025-10-11 23:12:28.268415-06
12	616	Sin obligaciones fiscales	t	2025-10-11 23:12:28.26881-06
13	620	Sociedades Cooperativas de Producción que optan por diferir sus ingresos	t	2025-10-11 23:12:28.269139-06
14	621	Incorporación Fiscal	t	2025-10-11 23:12:28.269467-06
15	622	Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras	t	2025-10-11 23:12:28.269747-06
16	623	Opcional para Grupos de Sociedades	t	2025-10-11 23:12:28.270012-06
17	624	Coordinados	t	2025-10-11 23:12:28.270265-06
18	625	Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas	t	2025-10-11 23:12:28.270519-06
19	626	Régimen Simplificado de Confianza	t	2025-10-11 23:12:28.270769-06
\.


--
-- Data for Name: sucursales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sucursales (id, nombre, direccion, telefono, gerente, activa, fecha_creacion, fecha_modificacion) FROM stdin;
1	Sucursal Principal	Av. Principal #123, Centro	555-1234	Juan Pérez	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
2	Sucursal Norte	Av. Norte #456, Zona Norte	555-2345	María García	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
3	Sucursal Sur	Av. Sur #789, Zona Sur	555-3456	Carlos López	t	2025-12-08 00:00:00-06	2025-12-08 00:00:00-06
\.


--
-- Data for Name: usos_cfdi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usos_cfdi (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	G01	Adquisición de mercancías	t	2025-10-11 23:12:28.271148-06
2	G02	Devoluciones, descuentos o bonificaciones	t	2025-10-11 23:12:28.272833-06
3	G03	Gastos en general	t	2025-10-11 23:12:28.273095-06
4	I01	Construcciones	t	2025-10-11 23:12:28.273353-06
5	I02	Mobiliario y equipo de oficina por inversiones	t	2025-10-11 23:12:28.273602-06
6	I03	Equipo de transporte	t	2025-10-11 23:12:28.273847-06
7	I04	Equipo de cómputo y accesorios	t	2025-10-11 23:12:28.274093-06
8	I05	Dados, troqueles, moldes, matrices y herramental	t	2025-10-11 23:12:28.274337-06
9	I06	Comunicaciones telefónicas	t	2025-10-11 23:12:28.274586-06
10	I07	Comunicaciones satelitales	t	2025-10-11 23:12:28.27487-06
11	I08	Otra maquinaria y equipo	t	2025-10-11 23:12:28.275168-06
12	D01	Honorarios médicos, dentales y gastos hospitalarios	t	2025-10-11 23:12:28.275478-06
13	D02	Gastos médicos por incapacidad o discapacidad	t	2025-10-11 23:12:28.275744-06
14	D03	Gastos funerales	t	2025-10-11 23:12:28.276009-06
15	D04	Donativos	t	2025-10-11 23:12:28.276286-06
16	D05	Intereses reales efectivamente pagados por créditos hipotecarios	t	2025-10-11 23:12:28.276545-06
17	D06	Aportaciones voluntarias al SAR	t	2025-10-11 23:12:28.276799-06
18	D07	Primas por seguros de gastos médicos	t	2025-10-11 23:12:28.277045-06
19	D08	Gastos de transportación escolar obligatoria	t	2025-10-11 23:12:28.277292-06
20	D09	Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones	t	2025-10-11 23:12:28.27754-06
21	D10	Pagos por servicios educativos (colegiaturas)	t	2025-10-11 23:12:28.277791-06
22	S01	Sin efectos fiscales	t	2025-10-11 23:12:28.278038-06
23	CP01	Pagos	t	2025-10-11 23:12:28.278364-06
24	CN01	Nómina	t	2025-10-11 23:12:28.278617-06
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, username, password, nombre, email, role, roles, empleado_id, activo, fecha_registro, fecha_modificacion, ultimo_acceso, full_name, phone, bio, profile_image) FROM stdin;
2	001.robertomar	$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7	Roberto Martinez	roberto.martinez@supercopias.com	admin	["admin"]	1	t	2025-12-08 14:53:22.065258-06	2025-12-08 14:53:22.065258-06	\N	Roberto Martinez Sanchez	961-100-1001	Gerente General - Administrador del sistema	\N
3	002.lauragomez	$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7	Laura Gomez	laura.gomez@supercopias.com	empleado	["empleado"]	2	t	2025-12-08 14:53:22.0686-06	2025-12-08 14:53:22.0686-06	\N	Laura Gomez Perez	961-100-1002	Gerente de Sucursal Principal - Acceso personalizado	\N
4	003.carloshern	$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7	Carlos Hernandez	carlos.hernandez@supercopias.com	empleado	["empleado"]	3	t	2025-12-08 14:53:22.069178-06	2025-12-08 14:53:22.069178-06	\N	Carlos Hernandez Lopez	961-100-1003	Gerente de Sucursal Norte - Acceso personalizado	\N
5	004.anamariarui	$2a$10$5h8ZQZ7X5v5Z7X5v5Z7X5uXJ8ZQZ7X5v5Z7X5v5Z7X5v5Z7X5v5Z7	Ana Maria Ruiz	ana.ruiz@supercopias.com	empleado	["empleado"]	4	t	2025-12-08 14:53:22.069517-06	2025-12-08 14:53:22.069517-06	\N	Ana Maria Ruiz Torres	961-100-1004	Supervisor - Acceso personalizado	\N
6	005.Jhonatan	$2a$08$le4AuouGc8R..iU2/oYMi.qxvurNC9wycnVKwsjj6aG1hu/DpYW7u	Jhonatan Grajales	prueba@mail.com	empleado	["empleado"]	11	t	2025-12-08 14:57:23.994707-06	2025-12-08 14:59:41.100037-06	2025-12-08 14:59:41.100037-06	Jhonatan Grajales	5544935853	Empleado - Acceso personalizado	\N
1	admin	$2a$10$vTJe5E7cA9KIuRWpYqXp6OOyS7luHxk6dyz4wJckCwWs./RPAlmyq	Administrador SuperCopias	admin@supercopias.com	admin	["admin"]	\N	t	2025-10-12 00:09:08.738514-06	2026-03-07 21:02:13.287223-06	2026-03-07 21:02:13.287223-06	Administrador SuperCopias	+52 961 100 0000	Administrador principal del sistema SuperCopias	\N
\.


--
-- Name: auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auditoria_id_seq', 43, true);


--
-- Name: cat_estatus_equipo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_estatus_equipo_id_seq', 4, true);


--
-- Name: cat_marcas_equipo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_marcas_equipo_id_seq', 17, true);


--
-- Name: cat_metodos_pago_proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_metodos_pago_proveedor_id_seq', 6, true);


--
-- Name: cat_tipos_equipo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_tipos_equipo_id_seq', 8, true);


--
-- Name: cat_tipos_proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_tipos_proveedor_id_seq', 3, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clientes_id_seq', 5, true);


--
-- Name: empleados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empleados_id_seq', 11, true);


--
-- Name: empleados_modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empleados_modulos_id_seq', 13, true);


--
-- Name: equipos_caracteristicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.equipos_caracteristicas_id_seq', 1, true);


--
-- Name: equipos_consumibles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.equipos_consumibles_id_seq', 1, false);


--
-- Name: equipos_historial_contador_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.equipos_historial_contador_id_seq', 1, true);


--
-- Name: equipos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.equipos_id_seq', 6, true);


--
-- Name: equipos_mantenimiento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.equipos_mantenimiento_id_seq', 1, true);


--
-- Name: estados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estados_id_seq', 64, true);


--
-- Name: eventos_personal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.eventos_personal_id_seq', 1, false);


--
-- Name: formas_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.formas_pago_id_seq', 44, true);


--
-- Name: inv_departamentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inv_departamentos_id_seq', 3, true);


--
-- Name: inventarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventarios_id_seq', 13, true);


--
-- Name: inventarios_movimientos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventarios_movimientos_id_seq', 7, true);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.metodos_pago_id_seq', 4, true);


--
-- Name: modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modulos_id_seq', 10, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 6, true);


--
-- Name: puestos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puestos_id_seq', 8, true);


--
-- Name: regimenes_fiscales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.regimenes_fiscales_id_seq', 38, true);


--
-- Name: sucursales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sucursales_id_seq', 3, true);


--
-- Name: usos_cfdi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usos_cfdi_id_seq', 48, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 6, true);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: cat_estatus_equipo cat_estatus_equipo_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estatus_equipo
    ADD CONSTRAINT cat_estatus_equipo_codigo_key UNIQUE (codigo);


--
-- Name: cat_estatus_equipo cat_estatus_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estatus_equipo
    ADD CONSTRAINT cat_estatus_equipo_pkey PRIMARY KEY (id);


--
-- Name: cat_marcas_equipo cat_marcas_equipo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_marcas_equipo
    ADD CONSTRAINT cat_marcas_equipo_nombre_key UNIQUE (nombre);


--
-- Name: cat_marcas_equipo cat_marcas_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_marcas_equipo
    ADD CONSTRAINT cat_marcas_equipo_pkey PRIMARY KEY (id);


--
-- Name: cat_metodos_pago_proveedor cat_metodos_pago_proveedor_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodos_pago_proveedor
    ADD CONSTRAINT cat_metodos_pago_proveedor_clave_key UNIQUE (clave);


--
-- Name: cat_metodos_pago_proveedor cat_metodos_pago_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodos_pago_proveedor
    ADD CONSTRAINT cat_metodos_pago_proveedor_pkey PRIMARY KEY (id);


--
-- Name: cat_tipos_equipo cat_tipos_equipo_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_equipo
    ADD CONSTRAINT cat_tipos_equipo_codigo_key UNIQUE (codigo);


--
-- Name: cat_tipos_equipo cat_tipos_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_equipo
    ADD CONSTRAINT cat_tipos_equipo_pkey PRIMARY KEY (id);


--
-- Name: cat_tipos_proveedor cat_tipos_proveedor_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_proveedor
    ADD CONSTRAINT cat_tipos_proveedor_clave_key UNIQUE (clave);


--
-- Name: cat_tipos_proveedor cat_tipos_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_proveedor
    ADD CONSTRAINT cat_tipos_proveedor_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_email_key UNIQUE (email);


--
-- Name: empleados_modulos empleados_modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados_modulos
    ADD CONSTRAINT empleados_modulos_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id);


--
-- Name: equipos_caracteristicas equipos_caracteristicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_caracteristicas
    ADD CONSTRAINT equipos_caracteristicas_pkey PRIMARY KEY (id);


--
-- Name: equipos_consumibles equipos_consumibles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_consumibles
    ADD CONSTRAINT equipos_consumibles_pkey PRIMARY KEY (id);


--
-- Name: equipos_historial_contador equipos_historial_contador_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_historial_contador
    ADD CONSTRAINT equipos_historial_contador_pkey PRIMARY KEY (id);


--
-- Name: equipos_mantenimiento equipos_mantenimiento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_mantenimiento
    ADD CONSTRAINT equipos_mantenimiento_pkey PRIMARY KEY (id);


--
-- Name: equipos equipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos
    ADD CONSTRAINT equipos_pkey PRIMARY KEY (id);


--
-- Name: estados estados_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_codigo_key UNIQUE (codigo);


--
-- Name: estados estados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_pkey PRIMARY KEY (id);


--
-- Name: eventos_personal eventos_personal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_personal
    ADD CONSTRAINT eventos_personal_pkey PRIMARY KEY (id);


--
-- Name: formas_pago formas_pago_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formas_pago
    ADD CONSTRAINT formas_pago_codigo_key UNIQUE (codigo);


--
-- Name: formas_pago formas_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formas_pago
    ADD CONSTRAINT formas_pago_pkey PRIMARY KEY (id);


--
-- Name: inv_departamentos inv_departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_departamentos
    ADD CONSTRAINT inv_departamentos_pkey PRIMARY KEY (id);


--
-- Name: inventarios_movimientos inventarios_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_movimientos
    ADD CONSTRAINT inventarios_movimientos_pkey PRIMARY KEY (id);


--
-- Name: inventarios inventarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios
    ADD CONSTRAINT inventarios_pkey PRIMARY KEY (id);


--
-- Name: inv_tabulador_precios inv_tabulador_precios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_tabulador_precios
    ADD CONSTRAINT inv_tabulador_precios_pkey PRIMARY KEY (id);


--
-- Name: inv_tabulador_precios inv_tabulador_precios_inventario_cantidad_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_tabulador_precios
    ADD CONSTRAINT inv_tabulador_precios_inventario_cantidad_key UNIQUE (inventario_id, cantidad_desde);


--
-- Name: metodos_pago metodos_pago_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_codigo_key UNIQUE (codigo);


--
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- Name: modulos modulos_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_clave_key UNIQUE (clave);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: puestos puestos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puestos
    ADD CONSTRAINT puestos_pkey PRIMARY KEY (id);


--
-- Name: regimenes_fiscales regimenes_fiscales_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regimenes_fiscales
    ADD CONSTRAINT regimenes_fiscales_codigo_key UNIQUE (codigo);


--
-- Name: regimenes_fiscales regimenes_fiscales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regimenes_fiscales
    ADD CONSTRAINT regimenes_fiscales_pkey PRIMARY KEY (id);


--
-- Name: sucursales sucursales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_pkey PRIMARY KEY (id);


--
-- Name: empleados_modulos uk_empleados_modulos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados_modulos
    ADD CONSTRAINT uk_empleados_modulos UNIQUE (empleado_id, modulo);


--
-- Name: puestos unique_puesto_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.puestos
    ADD CONSTRAINT unique_puesto_nombre UNIQUE (nombre);


--
-- Name: sucursales unique_sucursal_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT unique_sucursal_nombre UNIQUE (nombre);


--
-- Name: inv_departamentos uq_inv_departamentos_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_departamentos
    ADD CONSTRAINT uq_inv_departamentos_nombre UNIQUE (nombre);


--
-- Name: usos_cfdi usos_cfdi_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usos_cfdi
    ADD CONSTRAINT usos_cfdi_codigo_key UNIQUE (codigo);


--
-- Name: usos_cfdi usos_cfdi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usos_cfdi
    ADD CONSTRAINT usos_cfdi_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: idx_auditoria_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_operacion);


--
-- Name: idx_auditoria_operacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_operacion ON public.auditoria USING btree (operacion);


--
-- Name: idx_auditoria_registro_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_registro_id ON public.auditoria USING btree (registro_id);


--
-- Name: idx_auditoria_tabla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_tabla ON public.auditoria USING btree (tabla);


--
-- Name: idx_auditoria_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_usuario_id ON public.auditoria USING btree (usuario_id);


--
-- Name: idx_caracteristicas_equipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_caracteristicas_equipo ON public.equipos_caracteristicas USING btree (equipo_id);


--
-- Name: idx_cat_estatus_equipo_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_estatus_equipo_activo ON public.cat_estatus_equipo USING btree (activo);


--
-- Name: idx_cat_estatus_equipo_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_estatus_equipo_codigo ON public.cat_estatus_equipo USING btree (codigo);


--
-- Name: idx_cat_marcas_equipo_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_marcas_equipo_activo ON public.cat_marcas_equipo USING btree (activo);


--
-- Name: idx_cat_marcas_equipo_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_marcas_equipo_nombre ON public.cat_marcas_equipo USING btree (nombre);


--
-- Name: idx_cat_metodos_pago_proveedor_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_metodos_pago_proveedor_activo ON public.cat_metodos_pago_proveedor USING btree (activo);


--
-- Name: idx_cat_metodos_pago_proveedor_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_metodos_pago_proveedor_clave ON public.cat_metodos_pago_proveedor USING btree (clave);


--
-- Name: idx_cat_tipos_equipo_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_tipos_equipo_activo ON public.cat_tipos_equipo USING btree (activo);


--
-- Name: idx_cat_tipos_equipo_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_tipos_equipo_codigo ON public.cat_tipos_equipo USING btree (codigo);


--
-- Name: idx_cat_tipos_proveedor_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_tipos_proveedor_activo ON public.cat_tipos_proveedor USING btree (activo);


--
-- Name: idx_cat_tipos_proveedor_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_tipos_proveedor_clave ON public.cat_tipos_proveedor USING btree (clave);


--
-- Name: idx_clientes_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_activo ON public.clientes USING btree (activo);


--
-- Name: idx_clientes_codigo_postal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_codigo_postal ON public.clientes USING btree (direccion_codigo_postal);


--
-- Name: idx_clientes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_email ON public.clientes USING btree (email);


--
-- Name: idx_clientes_razon_social; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_razon_social ON public.clientes USING btree (razon_social);


--
-- Name: idx_consumibles_equipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumibles_equipo ON public.equipos_consumibles USING btree (equipo_id);


--
-- Name: idx_consumibles_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumibles_tipo ON public.equipos_consumibles USING btree (tipo_consumible);


--
-- Name: idx_empleados_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_activo ON public.empleados USING btree (activo);


--
-- Name: idx_empleados_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_email ON public.empleados USING btree (email);


--
-- Name: idx_empleados_fecha_ingreso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_fecha_ingreso ON public.empleados USING btree (fecha_ingreso);


--
-- Name: idx_empleados_modulos_acceso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_modulos_acceso ON public.empleados_modulos USING btree (acceso);


--
-- Name: idx_empleados_modulos_empleado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_modulos_empleado_id ON public.empleados_modulos USING btree (empleado_id);


--
-- Name: idx_empleados_modulos_modulo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_modulos_modulo ON public.empleados_modulos USING btree (modulo);


--
-- Name: idx_empleados_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_nombre ON public.empleados USING btree (nombre);


--
-- Name: idx_equipos_cliente_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipos_cliente_nombre ON public.equipos USING btree (cliente_nombre);


--
-- Name: idx_equipos_estatus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipos_estatus ON public.equipos USING btree (estatus);


--
-- Name: idx_equipos_serie; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipos_serie ON public.equipos USING btree (numero_serie);


--
-- Name: idx_equipos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipos_tipo ON public.equipos USING btree (tipo_equipo);


--
-- Name: idx_estados_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estados_codigo ON public.estados USING btree (codigo);


--
-- Name: idx_eventos_empleado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_empleado ON public.eventos_personal USING btree (empleado_id);


--
-- Name: idx_eventos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_estado ON public.eventos_personal USING btree (estado);


--
-- Name: idx_eventos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_fecha ON public.eventos_personal USING btree (fecha_inicio);


--
-- Name: idx_eventos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_tipo ON public.eventos_personal USING btree (tipo);


--
-- Name: idx_formas_pago_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_formas_pago_codigo ON public.formas_pago USING btree (codigo);


--
-- Name: idx_historial_contador_equipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_contador_equipo ON public.equipos_historial_contador USING btree (equipo_id);


--
-- Name: idx_historial_contador_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_contador_fecha ON public.equipos_historial_contador USING btree (fecha_lectura DESC);


--
-- Name: idx_inv_departamentos_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_departamentos_activo ON public.inv_departamentos USING btree (activo);


--
-- Name: idx_inv_departamentos_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_departamentos_orden ON public.inv_departamentos USING btree (orden);


--
-- Name: idx_inventarios_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_activo ON public.inventarios USING btree (activo);


--
-- Name: idx_inventarios_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_categoria ON public.inventarios USING btree (categoria);


--
-- Name: idx_inventarios_codigo_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_codigo_sku ON public.inventarios USING btree (codigo_sku);


--
-- Name: idx_inventarios_departamento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_departamento ON public.inventarios USING btree (departamento_id);


--
-- Name: idx_inventarios_disponible_pos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_disponible_pos ON public.inventarios USING btree (disponible_en_pos);


--
-- Name: idx_inventarios_es_servicio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_es_servicio ON public.inventarios USING btree (es_servicio);


--
-- Name: idx_inventarios_estatus; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_estatus ON public.inventarios USING btree (estatus);


--
-- Name: idx_inventarios_movimientos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_movimientos_fecha ON public.inventarios_movimientos USING btree (fecha_movimiento DESC);


--
-- Name: idx_inventarios_movimientos_inventario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_movimientos_inventario ON public.inventarios_movimientos USING btree (inventario_id);


--
-- Name: idx_inventarios_movimientos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_movimientos_tipo ON public.inventarios_movimientos USING btree (tipo_movimiento);


--
-- Name: idx_inventarios_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_nombre ON public.inventarios USING btree (nombre);


--
-- Name: idx_inventarios_proveedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_proveedor ON public.inventarios USING btree (proveedor_id);


--
-- Name: idx_inventarios_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventarios_tipo ON public.inventarios USING btree (tipo);


--
-- Name: idx_mantenimiento_equipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimiento_equipo ON public.equipos_mantenimiento USING btree (equipo_id);


--
-- Name: idx_mantenimiento_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimiento_fecha ON public.equipos_mantenimiento USING btree (fecha_servicio DESC);


--
-- Name: idx_metodos_pago_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_metodos_pago_codigo ON public.metodos_pago USING btree (codigo);


--
-- Name: idx_modulos_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modulos_activo ON public.modulos USING btree (activo);


--
-- Name: idx_modulos_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modulos_clave ON public.modulos USING btree (clave);


--
-- Name: idx_proveedores_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_activo ON public.proveedores USING btree (activo);


--
-- Name: idx_proveedores_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_email ON public.proveedores USING btree (email);


--
-- Name: idx_proveedores_rfc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_rfc ON public.proveedores USING btree (rfc);


--
-- Name: idx_proveedores_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_tipo ON public.proveedores USING btree (tipo_proveedor);


--
-- Name: idx_puestos_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_puestos_activo ON public.puestos USING btree (activo);


--
-- Name: idx_puestos_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_puestos_nombre ON public.puestos USING btree (nombre);


--
-- Name: idx_regimenes_fiscales_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regimenes_fiscales_codigo ON public.regimenes_fiscales USING btree (codigo);


--
-- Name: idx_sucursales_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sucursales_activa ON public.sucursales USING btree (activa);


--
-- Name: idx_sucursales_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sucursales_nombre ON public.sucursales USING btree (nombre);


--
-- Name: idx_usos_cfdi_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usos_cfdi_codigo ON public.usos_cfdi USING btree (codigo);


--
-- Name: idx_usuarios_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_activo ON public.usuarios USING btree (activo);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_empleado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_empleado_id ON public.usuarios USING btree (empleado_id);


--
-- Name: idx_usuarios_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_role ON public.usuarios USING btree (role);


--
-- Name: idx_usuarios_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_username ON public.usuarios USING btree (username);


--
-- Name: clientes trg_clientes_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clientes_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: clientes trg_clientes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: empleados trg_empleados_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_empleados_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: empleados trg_empleados_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_empleados_updated_at BEFORE UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: eventos_personal trg_eventos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_eventos_updated_at BEFORE UPDATE ON public.eventos_personal FOR EACH ROW EXECUTE FUNCTION public.trigger_eventos_updated_at();


--
-- Name: proveedores trg_proveedores_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_proveedores_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: proveedores trg_proveedores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: puestos trg_puestos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_puestos_updated_at BEFORE UPDATE ON public.puestos FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: sucursales trg_sucursales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sucursales_updated_at BEFORE UPDATE ON public.sucursales FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: usuarios trg_usuarios_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_usuarios_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: usuarios trg_usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: inventarios trg_inventarios_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inventarios_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.inventarios FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: pos_ventas trg_pos_ventas_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pos_ventas_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.pos_ventas FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: equipos trg_equipos_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_equipos_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.equipos FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: facturas trg_facturas_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_facturas_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.facturas FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: pos_clientes_puntos trg_pos_clientes_puntos_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pos_clientes_puntos_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.pos_clientes_puntos FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: eventos_personal eventos_personal_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_personal
    ADD CONSTRAINT eventos_personal_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuarios(id);


--
-- Name: eventos_personal eventos_personal_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_personal
    ADD CONSTRAINT eventos_personal_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;


--
-- Name: eventos_personal eventos_personal_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_personal
    ADD CONSTRAINT eventos_personal_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: equipos_caracteristicas fk_caracteristicas_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_caracteristicas
    ADD CONSTRAINT fk_caracteristicas_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE;


--
-- Name: equipos_consumibles fk_consumibles_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_consumibles
    ADD CONSTRAINT fk_consumibles_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE;


--
-- Name: empleados_modulos fk_empleados_modulos_empleado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados_modulos
    ADD CONSTRAINT fk_empleados_modulos_empleado FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;


--
-- Name: empleados fk_empleados_puesto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_puesto FOREIGN KEY (puesto_id) REFERENCES public.puestos(id);


--
-- Name: empleados fk_empleados_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);


--
-- Name: equipos_historial_contador fk_historial_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_historial_contador
    ADD CONSTRAINT fk_historial_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE;


--
-- Name: inventarios fk_inventarios_departamento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios
    ADD CONSTRAINT fk_inventarios_departamento FOREIGN KEY (departamento_id) REFERENCES public.inv_departamentos(id);


--
-- Name: inventarios_movimientos fk_inventarios_movimientos_inventario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios_movimientos
    ADD CONSTRAINT fk_inventarios_movimientos_inventario FOREIGN KEY (inventario_id) REFERENCES public.inventarios(id) ON DELETE CASCADE;


--
-- Name: inventarios fk_inventarios_proveedor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventarios
    ADD CONSTRAINT fk_inventarios_proveedor FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id) ON DELETE SET NULL;


--
-- Name: inv_tabulador_precios fk_tabulador_inventario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inv_tabulador_precios
    ADD CONSTRAINT fk_tabulador_inventario FOREIGN KEY (inventario_id) REFERENCES public.inventarios(id) ON DELETE CASCADE;


--
-- Name: equipos_mantenimiento fk_mantenimiento_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipos_mantenimiento
    ADD CONSTRAINT fk_mantenimiento_equipo FOREIGN KEY (equipo_id) REFERENCES public.equipos(id) ON DELETE CASCADE;


--
-- Name: usuarios fk_usuarios_empleado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_empleado FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- =====================================================
-- MÓDULO: Punto de Venta (POS) - v1.0.0 - 2026-03-08
-- =====================================================
--

--
-- Name: pos_alertas_seguridad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_alertas_seguridad (
    id              integer NOT NULL,
    created_at      timestamp with time zone DEFAULT now() NOT NULL,
    tipo            character varying(60) NOT NULL,
    usuario_id      integer,
    usuario_nombre  character varying(120),
    ip              character varying(60),
    detalle         jsonb,
    descripcion     text
);

COMMENT ON TABLE public.pos_alertas_seguridad IS 'Registro de alertas de seguridad del POS (p.ej. manipulación de precios)';
COMMENT ON COLUMN public.pos_alertas_seguridad.tipo IS 'Código de alerta, p.ej. PRECIO_MANIPULADO';
COMMENT ON COLUMN public.pos_alertas_seguridad.detalle IS 'JSON con contexto detallado del incidente';

CREATE SEQUENCE public.pos_alertas_seguridad_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.pos_alertas_seguridad_id_seq OWNED BY public.pos_alertas_seguridad.id;
ALTER TABLE ONLY public.pos_alertas_seguridad ALTER COLUMN id SET DEFAULT nextval('public.pos_alertas_seguridad_id_seq'::regclass);

--
-- Name: pos_descuentos_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_descuentos_config (
    id                          integer NOT NULL,
    nombre                      character varying(100) NOT NULL,
    descripcion                 text,
    tipo                        character varying(30) NOT NULL,
    valor                       numeric(10,2) NOT NULL,
    requiere_autorizacion       boolean DEFAULT false,
    limite_porcentaje_cajero    numeric(5,2) DEFAULT 15.00,
    activo                      boolean DEFAULT true,
    fecha_vigencia_inicio       date,
    fecha_vigencia_fin          date,
    fecha_creacion              timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion          timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pos_descuento_tipo CHECK (((tipo)::text = ANY (ARRAY[
        ('porcentaje_global'::character varying)::text,
        ('monto_fijo'::character varying)::text,
        ('vip_automatico'::character varying)::text,
        ('cupon'::character varying)::text
    ]))),
    CONSTRAINT chk_pos_descuento_valor CHECK (valor >= 0)
);

COMMENT ON TABLE public.pos_descuentos_config IS 'Catálogo de reglas de descuento para el Punto de Venta';


CREATE SEQUENCE public.pos_descuentos_config_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.pos_descuentos_config_id_seq OWNED BY public.pos_descuentos_config.id;
ALTER TABLE ONLY public.pos_descuentos_config ALTER COLUMN id SET DEFAULT nextval('public.pos_descuentos_config_id_seq'::regclass);
ALTER TABLE ONLY public.pos_descuentos_config
    ADD CONSTRAINT pos_descuentos_config_pkey PRIMARY KEY (id);


--
-- Name: pos_ventas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_ventas (
    id                          integer NOT NULL,
    folio                       character varying(25) NOT NULL,
    fecha_venta                 timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cliente_id                  integer,
    cliente_nombre              character varying(500) DEFAULT 'Público General'::character varying,
    vendedor_usuario_id         integer,
    vendedor_nombre             character varying(255) NOT NULL,
    sucursal_id                 integer,
    subtotal                    numeric(12,2) NOT NULL,
    descuento_pct               numeric(5,2) DEFAULT 0,
    descuento_monto             numeric(12,2) DEFAULT 0,
    total                       numeric(12,2) NOT NULL,
    monto_recibido              numeric(12,2),
    cambio                      numeric(12,2) DEFAULT 0,
    metodo_pago_codigo          character varying(30),
    metodo_pago_descripcion     character varying(100),
    descuento_config_id         integer,
    descuento_autorizado_por    character varying(255),
    estatus                     character varying(20) DEFAULT 'completada'::character varying,
    motivo_cancelacion          text,
    notas                       text,
    ticket_generado             boolean DEFAULT false,
    requiere_factura            boolean DEFAULT false,
    factura_id                  integer,
    iva_monto                   numeric(12,2) DEFAULT 0,
    isr_monto                   numeric(12,2) DEFAULT 0,
    fecha_modificacion          timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pos_ventas_estatus CHECK (((estatus)::text = ANY (ARRAY[
        ('completada'::character varying)::text,
        ('cancelada'::character varying)::text,
        ('devuelta'::character varying)::text
    ]))),
    CONSTRAINT chk_pos_ventas_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_pos_ventas_total CHECK (total >= 0),
    CONSTRAINT chk_pos_ventas_descuento_pct CHECK (descuento_pct BETWEEN 0 AND 100),
    CONSTRAINT chk_pos_ventas_descuento_monto CHECK (descuento_monto >= 0)
);

COMMENT ON TABLE public.pos_ventas IS 'Registro de ventas del Punto de Venta - cabecera de cada transacción';
COMMENT ON COLUMN public.pos_ventas.folio IS 'Folio único de venta en formato PV-YYYY-NNNNN';
COMMENT ON COLUMN public.pos_ventas.cliente_id IS 'NULL = venta a Público General sin cliente registrado';

CREATE SEQUENCE public.pos_ventas_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.pos_ventas_id_seq OWNED BY public.pos_ventas.id;
ALTER TABLE ONLY public.pos_ventas ALTER COLUMN id SET DEFAULT nextval('public.pos_ventas_id_seq'::regclass);
ALTER TABLE ONLY public.pos_ventas
    ADD CONSTRAINT pos_ventas_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX idx_pos_ventas_folio    ON public.pos_ventas (folio);
CREATE INDEX idx_pos_ventas_fecha           ON public.pos_ventas (fecha_venta DESC);
CREATE INDEX idx_pos_ventas_cliente         ON public.pos_ventas (cliente_id);
CREATE INDEX idx_pos_ventas_vendedor        ON public.pos_ventas (vendedor_usuario_id);
CREATE INDEX idx_pos_ventas_estatus         ON public.pos_ventas (estatus);


--
-- Name: pos_ventas_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_ventas_detalle (
    id                      integer NOT NULL,
    venta_id                integer NOT NULL,
    inventario_id           integer,
    nombre_producto         character varying(255) NOT NULL,
    sku                     character varying(50),
    es_servicio             boolean DEFAULT false,
    es_item_libre           boolean DEFAULT false,
    cantidad                numeric(10,2) NOT NULL,
    precio_unitario         numeric(12,2) NOT NULL,
    descuento_linea_pct     numeric(5,2) DEFAULT 0,
    descuento_linea_monto   numeric(12,2) DEFAULT 0,
    subtotal_linea          numeric(12,2) NOT NULL,
    tabulador_aplicado      boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_pos_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_pos_detalle_precio CHECK (precio_unitario >= 0),
    CONSTRAINT chk_pos_detalle_desc_pct CHECK (descuento_linea_pct BETWEEN 0 AND 100),
    CONSTRAINT chk_pos_detalle_sub CHECK (subtotal_linea >= 0)
);

COMMENT ON TABLE public.pos_ventas_detalle IS 'Líneas de productos/servicios de cada venta del POS';
COMMENT ON COLUMN public.pos_ventas_detalle.inventario_id IS 'NULL cuando es_item_libre=TRUE';
COMMENT ON COLUMN public.pos_ventas_detalle.es_item_libre IS 'TRUE = producto ingresado manualmente sin inventario asignado';

CREATE SEQUENCE public.pos_ventas_detalle_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.pos_ventas_detalle_id_seq OWNED BY public.pos_ventas_detalle.id;
ALTER TABLE ONLY public.pos_ventas_detalle ALTER COLUMN id SET DEFAULT nextval('public.pos_ventas_detalle_id_seq'::regclass);
ALTER TABLE ONLY public.pos_ventas_detalle
    ADD CONSTRAINT pos_ventas_detalle_pkey PRIMARY KEY (id);

CREATE INDEX idx_pos_detalle_venta      ON public.pos_ventas_detalle (venta_id);
CREATE INDEX idx_pos_detalle_inventario ON public.pos_ventas_detalle (inventario_id);
CREATE INDEX idx_tabulador_inventario_id ON public.inv_tabulador_precios (inventario_id, cantidad_desde ASC);


--
-- Name: pos_clientes_puntos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_clientes_puntos (
    id                  integer NOT NULL,
    cliente_id          integer NOT NULL,
    puntos_acumulados   integer DEFAULT 0,
    puntos_canjeados    integer DEFAULT 0,
    puntos_disponibles  integer GENERATED ALWAYS AS (puntos_acumulados - puntos_canjeados) STORED,
    nivel_cliente       character varying(20) DEFAULT 'estandar'::character varying,
    total_comprado      numeric(14,2) DEFAULT 0,
    fecha_ultima_compra timestamp with time zone,
    fecha_registro      timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pos_puntos_nivel CHECK (((nivel_cliente)::text = ANY (ARRAY[
        ('estandar'::character varying)::text,
        ('frecuente'::character varying)::text,
        ('vip'::character varying)::text
    ]))),
    CONSTRAINT chk_pos_puntos_acumulados CHECK (puntos_acumulados >= 0),
    CONSTRAINT chk_pos_puntos_canjeados CHECK (puntos_canjeados >= 0),
    CONSTRAINT chk_pos_puntos_total CHECK (total_comprado >= 0)
);

COMMENT ON TABLE public.pos_clientes_puntos IS 'Sistema de puntos y nivel de fidelización por cliente';
COMMENT ON COLUMN public.pos_clientes_puntos.nivel_cliente IS 'estandar (0-999) | frecuente (1000-4999) | vip (5000+)';

CREATE SEQUENCE public.pos_clientes_puntos_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.pos_clientes_puntos_id_seq OWNED BY public.pos_clientes_puntos.id;
ALTER TABLE ONLY public.pos_clientes_puntos ALTER COLUMN id SET DEFAULT nextval('public.pos_clientes_puntos_id_seq'::regclass);
ALTER TABLE ONLY public.pos_clientes_puntos
    ADD CONSTRAINT pos_clientes_puntos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pos_clientes_puntos
    ADD CONSTRAINT pos_clientes_puntos_cliente_unique UNIQUE (cliente_id);


--
-- Name: pos_clientes_puntos_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_clientes_puntos_movimientos (
    id              integer NOT NULL,
    cliente_id      integer NOT NULL,
    venta_id        integer,
    tipo            character varying(20) NOT NULL,
    puntos          integer NOT NULL,
    saldo_puntos    integer NOT NULL,
    notas           text,
    fecha           timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pos_puntos_mov_tipo CHECK (((tipo)::text = ANY (ARRAY[
        ('acumulado'::character varying)::text,
        ('canjeado'::character varying)::text,
        ('ajuste'::character varying)::text,
        ('vencido'::character varying)::text
    ])))
);

COMMENT ON TABLE public.pos_clientes_puntos_movimientos IS 'Historial de movimientos de puntos por cliente';

CREATE SEQUENCE public.pos_clientes_puntos_movimientos_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.pos_clientes_puntos_movimientos_id_seq OWNED BY public.pos_clientes_puntos_movimientos.id;
ALTER TABLE ONLY public.pos_clientes_puntos_movimientos ALTER COLUMN id SET DEFAULT nextval('public.pos_clientes_puntos_movimientos_id_seq'::regclass);
ALTER TABLE ONLY public.pos_clientes_puntos_movimientos
    ADD CONSTRAINT pos_clientes_puntos_movimientos_pkey PRIMARY KEY (id);

CREATE INDEX idx_pos_puntos_mov_cliente ON public.pos_clientes_puntos_movimientos (cliente_id);
CREATE INDEX idx_pos_puntos_mov_venta   ON public.pos_clientes_puntos_movimientos (venta_id);


--
-- Columna venta_id en inventarios_movimientos (trazabilidad POS)
--

ALTER TABLE ONLY public.inventarios_movimientos
    ADD COLUMN IF NOT EXISTS venta_id integer;

COMMENT ON COLUMN public.inventarios_movimientos.venta_id IS 'FK a pos_ventas cuando el movimiento es por una venta del POS';

CREATE INDEX idx_inv_mov_venta ON public.inventarios_movimientos (venta_id) WHERE venta_id IS NOT NULL;


--
-- Name: bitacora_negocio; Type: TABLE; Schema: public; Owner: -
-- Eventos de negocio registrados desde el backend con contexto semántico
-- Migración: 2026-04-20
--

CREATE TABLE public.bitacora_negocio (
    id              serial        NOT NULL,
    fecha           timestamptz   NOT NULL DEFAULT NOW(),
    modulo          varchar(50)   NOT NULL,
    accion          varchar(100)  NOT NULL,
    entidad         varchar(100),
    entidad_id      varchar(50),
    usuario_id      integer,
    usuario_nombre  varchar(255),
    ip_address      varchar(45),
    detalle         jsonb,
    resultado       varchar(20)   NOT NULL DEFAULT 'exito',
    CONSTRAINT bitacora_negocio_pkey PRIMARY KEY (id),
    CONSTRAINT chk_bitacora_resultado CHECK (resultado IN ('exito','error','bloqueado'))
);

COMMENT ON TABLE  public.bitacora_negocio IS 'Eventos de negocio registrados desde el backend con contexto semántico';
COMMENT ON COLUMN public.bitacora_negocio.modulo        IS 'Módulo origen: pos, pedidos, inventarios, auth, equipos...';
COMMENT ON COLUMN public.bitacora_negocio.accion        IS 'Código de acción: VENTA_COMPLETADA, LOGIN_EXITOSO, AJUSTE_STOCK...';
COMMENT ON COLUMN public.bitacora_negocio.entidad       IS 'Nombre de la tabla/entidad afectada';
COMMENT ON COLUMN public.bitacora_negocio.entidad_id    IS 'ID o folio del registro afectado';
COMMENT ON COLUMN public.bitacora_negocio.detalle       IS 'JSON con contexto específico del evento';
COMMENT ON COLUMN public.bitacora_negocio.resultado     IS 'exito | error | bloqueado';

CREATE INDEX idx_bitacora_fecha         ON public.bitacora_negocio (fecha DESC);
CREATE INDEX idx_bitacora_modulo        ON public.bitacora_negocio (modulo);
CREATE INDEX idx_bitacora_accion        ON public.bitacora_negocio (accion);
CREATE INDEX idx_bitacora_usuario       ON public.bitacora_negocio (usuario_id);
CREATE INDEX idx_bitacora_entidad       ON public.bitacora_negocio (entidad, entidad_id);
CREATE INDEX idx_bitacora_modulo_fecha  ON public.bitacora_negocio (modulo, fecha DESC);


--
-- FK Constraints POS
--

ALTER TABLE ONLY public.pos_alertas_seguridad
    ADD CONSTRAINT pos_alertas_seguridad_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pos_ventas
    ADD CONSTRAINT fk_pos_ventas_cliente      FOREIGN KEY (cliente_id)          REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_ventas
    ADD CONSTRAINT fk_pos_ventas_vendedor     FOREIGN KEY (vendedor_usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_ventas
    ADD CONSTRAINT fk_pos_ventas_sucursal     FOREIGN KEY (sucursal_id)         REFERENCES public.sucursales(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_ventas
    ADD CONSTRAINT fk_pos_ventas_descuento    FOREIGN KEY (descuento_config_id) REFERENCES public.pos_descuentos_config(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.pos_ventas_detalle
    ADD CONSTRAINT fk_pos_detalle_venta       FOREIGN KEY (venta_id)            REFERENCES public.pos_ventas(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pos_ventas_detalle
    ADD CONSTRAINT fk_pos_detalle_inventario  FOREIGN KEY (inventario_id)       REFERENCES public.inventarios(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.pos_clientes_puntos
    ADD CONSTRAINT fk_pos_puntos_cliente      FOREIGN KEY (cliente_id)          REFERENCES public.clientes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pos_clientes_puntos_movimientos
    ADD CONSTRAINT fk_pos_mov_cliente         FOREIGN KEY (cliente_id)          REFERENCES public.clientes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pos_clientes_puntos_movimientos
    ADD CONSTRAINT fk_pos_mov_venta           FOREIGN KEY (venta_id)            REFERENCES public.pos_ventas(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.inventarios_movimientos
    ADD CONSTRAINT fk_inv_mov_venta           FOREIGN KEY (venta_id)            REFERENCES public.pos_ventas(id) ON DELETE SET NULL;


--
-- Triggers POS
--

CREATE TRIGGER trg_pos_ventas_updated_at
    BEFORE UPDATE ON public.pos_ventas
    FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER trg_pos_descuentos_updated_at
    BEFORE UPDATE ON public.pos_descuentos_config
    FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER trg_pos_puntos_updated_at
    BEFORE UPDATE ON public.pos_clientes_puntos
    FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Datos iniciales POS
--

INSERT INTO public.pos_descuentos_config (nombre, descripcion, tipo, valor, requiere_autorizacion, limite_porcentaje_cajero, activo)
VALUES
    ('Descuento Estándar',  'Descuento manual por cajero hasta 15% sin autorización', 'porcentaje_global', 0,  FALSE, 15.00, TRUE),
    ('Descuento VIP',       'Descuento automático 10% para clientes nivel VIP',       'vip_automatico',    10, FALSE, 15.00, TRUE),
    ('Descuento Frecuente', 'Descuento automático 5% para clientes nivel Frecuente',  'vip_automatico',    5,  FALSE, 15.00, TRUE)
ON CONFLICT DO NOTHING;


-- ============================================================
-- MÓDULO COTIZACIONES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.pos_cotizaciones_folio_seq START 1;

CREATE TABLE IF NOT EXISTS public.pos_cotizaciones (
    id                    SERIAL PRIMARY KEY,
    folio                 VARCHAR(20) UNIQUE NOT NULL,
    estatus               VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    cliente_id            INTEGER,
    cliente_nombre        VARCHAR(200) NOT NULL DEFAULT 'Público General',
    vendedor_usuario_id   INTEGER,
    vendedor_nombre       VARCHAR(200),
    subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
    descuento_pct         NUMERIC(5,2)  NOT NULL DEFAULT 0,
    descuento_monto       NUMERIC(12,2) NOT NULL DEFAULT 0,
    total                 NUMERIC(12,2) NOT NULL DEFAULT 0,
    notas                 TEXT,
    fecha_vencimiento     DATE,
    venta_id              INTEGER,
    requiere_factura      BOOLEAN NOT NULL DEFAULT FALSE,
    factura_id            INTEGER,
    fecha_creacion        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_modificacion    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_cotizacion_estatus CHECK (estatus IN ('pendiente','aceptada','rechazada','vencida'))
);

CREATE TABLE IF NOT EXISTS public.pos_cotizaciones_detalle (
    id                    SERIAL PRIMARY KEY,
    cotizacion_id         INTEGER NOT NULL,
    inventario_id         INTEGER,
    nombre_producto       VARCHAR(300) NOT NULL,
    sku                   VARCHAR(100),
    es_servicio           BOOLEAN NOT NULL DEFAULT FALSE,
    es_item_libre         BOOLEAN NOT NULL DEFAULT FALSE,
    cantidad              NUMERIC(10,2) NOT NULL,
    precio_unitario       NUMERIC(12,2) NOT NULL,
    descuento_linea_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0,
    descuento_linea_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal_linea        NUMERIC(12,2) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pos_cotizaciones_estatus       ON public.pos_cotizaciones(estatus);
CREATE INDEX IF NOT EXISTS idx_pos_cotizaciones_cliente       ON public.pos_cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pos_cotizaciones_detalle_cot   ON public.pos_cotizaciones_detalle(cotizacion_id);

-- Foreign keys
ALTER TABLE ONLY public.pos_cotizaciones
    ADD CONSTRAINT fk_cotizaciones_cliente   FOREIGN KEY (cliente_id)  REFERENCES public.clientes(id)    ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_cotizaciones
    ADD CONSTRAINT fk_cotizaciones_venta     FOREIGN KEY (venta_id)    REFERENCES public.pos_ventas(id)  ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_cotizaciones_detalle
    ADD CONSTRAINT fk_cotizaciones_det_cot   FOREIGN KEY (cotizacion_id) REFERENCES public.pos_cotizaciones(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pos_cotizaciones_detalle
    ADD CONSTRAINT fk_cotizaciones_det_inv   FOREIGN KEY (inventario_id) REFERENCES public.inventarios(id) ON DELETE SET NULL;

-- Trigger updated_at
CREATE TRIGGER trg_pos_cotizaciones_updated_at
    BEFORE UPDATE ON public.pos_cotizaciones
    FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();

-- ============================================================
-- Horarios de Acceso
-- Controla automáticamente el acceso de empleados al sistema
-- según franjas horarias configuradas.
-- Migración: 2026-04-13
-- ============================================================

CREATE TABLE IF NOT EXISTS public.horarios_acceso (
    id             SERIAL PRIMARY KEY,
    nombre         CHARACTER VARYING(100) NOT NULL,
    hora_inicio    TIME NOT NULL,
    hora_fin       TIME NOT NULL,
    activo         BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_horarios_rango CHECK (hora_fin > hora_inicio)
);

COMMENT ON TABLE public.horarios_acceso IS
    'Franjas horarias que controlan el acceso automático de empleados al sistema';

-- Horario laboral por defecto: 6:40 am – 9:30 pm
INSERT INTO public.horarios_acceso (nombre, hora_inicio, hora_fin, activo)
VALUES ('Horario laboral', '06:40', '21:30', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- MÓDULO: Control de Sesiones
-- Sesión única por usuario + cierre por inactividad (15 min)
-- Migración: 2026-04-14
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id            SERIAL PRIMARY KEY,
    usuario_id    INTEGER NOT NULL,
    token_hash    CHARACTER VARYING(64) NOT NULL,
    ip_address    CHARACTER VARYING(45),
    user_agent    TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    active        BOOLEAN DEFAULT true NOT NULL,
    CONSTRAINT uq_user_sessions_token_hash UNIQUE (token_hash)
);

COMMENT ON TABLE  public.user_sessions IS 'Sesiones activas por usuario. Garantiza sesión única y controla inactividad (15 min).';
COMMENT ON COLUMN public.user_sessions.token_hash   IS 'SHA-256 del JWT. No se almacena el token crudo.';
COMMENT ON COLUMN public.user_sessions.expires_at   IS 'Expiración máxima del JWT (8 horas desde creación).';
COMMENT ON COLUMN public.user_sessions.active        IS 'false cuando la sesión fue desplazada, cerrada manualmente o expiró por inactividad.';

CREATE INDEX IF NOT EXISTS idx_user_sessions_usuario_active ON public.user_sessions (usuario_id, active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash     ON public.user_sessions (token_hash);

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT fk_user_sessions_usuario
    FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- ============================================================
-- MÓDULO: Pedidos POS
-- Flujo de trabajo: pendiente → en_proceso → terminado → finalizado
-- Al finalizar se convierte en venta (pos_ventas).
-- Migración: 2026-04-19
-- ============================================================

-- Cabecera del pedido
CREATE TABLE IF NOT EXISTS public.pos_pedidos (
    id                          SERIAL PRIMARY KEY,
    folio                       CHARACTER VARYING(25) UNIQUE NOT NULL,

    -- Estado del pedido
    estatus                     CHARACTER VARYING(20) NOT NULL DEFAULT 'pendiente',
    CONSTRAINT chk_pedido_estatus CHECK (estatus IN (
        'pendiente', 'en_proceso', 'terminado', 'finalizado', 'cancelado')),

    -- Cliente (puede ser libre o registrado)
    cliente_id                  INTEGER,
    cliente_nombre              CHARACTER VARYING(200) NOT NULL DEFAULT 'Público General',
    cliente_telefono            CHARACTER VARYING(30),

    -- ¿Pedido originado por WhatsApp?
    via_whatsapp                BOOLEAN NOT NULL DEFAULT FALSE,

    -- Facturación
    requiere_factura            BOOLEAN NOT NULL DEFAULT FALSE,

    -- Totales
    subtotal                    NUMERIC(12,2) NOT NULL DEFAULT 0,
    descuento_pct               NUMERIC(5,2)  NOT NULL DEFAULT 0,
    descuento_monto             NUMERIC(12,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(12,2) NOT NULL DEFAULT 0,
    anticipo                    NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Descuento
    descuento_config_id         INTEGER,
    descuento_autorizado_por    CHARACTER VARYING(200),

    -- Pago del anticipo
    metodo_pago_anticipo        CHARACTER VARYING(30),

    -- Pago del saldo al entregar
    metodo_pago_saldo           CHARACTER VARYING(30),
    monto_recibido_saldo        NUMERIC(12,2),

    -- Fecha acordada de entrega
    fecha_acordada              TIMESTAMP WITH TIME ZONE,

    -- Notas
    notas                       TEXT,

    -- Trazabilidad: quien levantó el pedido
    creado_por_id               INTEGER NOT NULL,
    creado_por_nombre           CHARACTER VARYING(200) NOT NULL,
    fecha_creacion              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Quien tomó el pedido (en_proceso)
    tomado_por_id               INTEGER,
    tomado_por_nombre           CHARACTER VARYING(200),
    fecha_tomado                TIMESTAMP WITH TIME ZONE,

    -- Quien terminó (terminado)
    terminado_por_id            INTEGER,
    terminado_por_nombre        CHARACTER VARYING(200),
    fecha_terminado             TIMESTAMP WITH TIME ZONE,

    -- Quien entregó (finalizado)
    entregado_por_id            INTEGER,
    entregado_por_nombre        CHARACTER VARYING(200),
    fecha_entregado             TIMESTAMP WITH TIME ZONE,

    -- Cancelación
    motivo_cancelacion          TEXT,

    -- Venta generada al finalizar
    venta_id                    INTEGER,

    -- Factura asociada
    factura_id                  INTEGER,

    fecha_modificacion          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE  public.pos_pedidos IS 'Pedidos levantados en el POS. Flujo: pendiente→en_proceso→terminado→finalizado. Al finalizar genera una venta.';
COMMENT ON COLUMN public.pos_pedidos.folio          IS 'Folio único en formato PP-YYYY-NNNNN';
COMMENT ON COLUMN public.pos_pedidos.anticipo       IS 'Monto cobrado por adelantado al levantar el pedido';
COMMENT ON COLUMN public.pos_pedidos.via_whatsapp   IS 'true si el pedido fue recibido por WhatsApp';

-- Detalle de ítems del pedido (estructura idéntica a pos_ventas_detalle)
CREATE TABLE IF NOT EXISTS public.pos_pedidos_detalle (
    id                    SERIAL PRIMARY KEY,
    pedido_id             INTEGER NOT NULL,
    inventario_id         INTEGER,
    nombre_producto       CHARACTER VARYING(300) NOT NULL,
    sku                   CHARACTER VARYING(100),
    es_servicio           BOOLEAN NOT NULL DEFAULT FALSE,
    es_item_libre         BOOLEAN NOT NULL DEFAULT FALSE,
    cantidad              NUMERIC(10,2) NOT NULL,
    precio_unitario       NUMERIC(12,2) NOT NULL,
    descuento_linea_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0,
    descuento_linea_monto NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal_linea        NUMERIC(12,2) NOT NULL
);

COMMENT ON TABLE public.pos_pedidos_detalle IS 'Líneas de producto/servicio de cada pedido';

-- Historial de cambios de estado (auditoría completa)
CREATE TABLE IF NOT EXISTS public.pos_pedidos_historial (
    id               SERIAL PRIMARY KEY,
    pedido_id        INTEGER NOT NULL,
    estatus_anterior CHARACTER VARYING(20),
    estatus_nuevo    CHARACTER VARYING(20) NOT NULL,
    usuario_id       INTEGER,
    usuario_nombre   CHARACTER VARYING(200) NOT NULL,
    notas            TEXT,
    fecha            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.pos_pedidos_historial IS 'Auditoría de cada cambio de estado en un pedido';

-- Índices
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_estatus       ON public.pos_pedidos (estatus);
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_cliente       ON public.pos_pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_creado_por    ON public.pos_pedidos (creado_por_id);
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_tomado_por    ON public.pos_pedidos (tomado_por_id);
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_fecha         ON public.pos_pedidos (fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_detalle_ped   ON public.pos_pedidos_detalle (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pos_pedidos_hist_ped      ON public.pos_pedidos_historial (pedido_id);

-- Foreign keys
ALTER TABLE ONLY public.pos_pedidos
    ADD CONSTRAINT fk_pedidos_cliente  FOREIGN KEY (cliente_id)  REFERENCES public.clientes(id)    ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_pedidos
    ADD CONSTRAINT fk_pedidos_venta    FOREIGN KEY (venta_id)    REFERENCES public.pos_ventas(id)  ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_pedidos_detalle
    ADD CONSTRAINT fk_pedidos_det_ped  FOREIGN KEY (pedido_id)   REFERENCES public.pos_pedidos(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.pos_pedidos_detalle
    ADD CONSTRAINT fk_pedidos_det_inv  FOREIGN KEY (inventario_id) REFERENCES public.inventarios(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.pos_pedidos_historial
    ADD CONSTRAINT fk_pedidos_hist_ped FOREIGN KEY (pedido_id)   REFERENCES public.pos_pedidos(id) ON DELETE CASCADE;

-- Trigger updated_at
CREATE TRIGGER trg_pos_pedidos_updated_at
    BEFORE UPDATE ON public.pos_pedidos
    FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


-- ============================================================
-- Módulo de Facturación CFDI 4.0
-- ============================================================

-- Secuencia para folio de facturas
CREATE SEQUENCE IF NOT EXISTS public.facturas_folio_seq START WITH 1;

--
-- Name: facturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.facturas (
    id                   SERIAL PRIMARY KEY,
    folio                VARCHAR(25) UNIQUE NOT NULL,  -- FA-2026-00001

    -- Estatus del flujo
    estatus              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CONSTRAINT chk_factura_estatus CHECK (
        estatus IN ('pendiente','generada','cancelada')
    ),

    -- Origen (solo uno de los tres será no-nulo)
    venta_id             INTEGER REFERENCES public.pos_ventas(id)       ON DELETE SET NULL,
    pedido_id            INTEGER REFERENCES public.pos_pedidos(id)      ON DELETE SET NULL,
    cotizacion_id        INTEGER REFERENCES public.pos_cotizaciones(id) ON DELETE SET NULL,
    tipo_origen          VARCHAR(20) NOT NULL,
    CONSTRAINT chk_factura_origen CHECK (tipo_origen IN ('venta','pedido','cotizacion')),

    -- Datos fiscales del cliente (snapshot al momento de emitir)
    cliente_id           INTEGER NOT NULL REFERENCES public.clientes(id),
    cliente_nombre       VARCHAR(500),
    cliente_rfc          VARCHAR(13),
    cliente_razon_social VARCHAR(500),
    cliente_regimen      VARCHAR(10),
    cliente_uso_cfdi     VARCHAR(10),
    cliente_cp           VARCHAR(10),

    -- Montos calculados (snapshot de tasas)
    subtotal             NUMERIC(12,2) NOT NULL,
    iva_pct              NUMERIC(6,4)  NOT NULL,
    iva_monto            NUMERIC(12,2) NOT NULL,
    isr_pct              NUMERIC(6,4)  NOT NULL,
    isr_monto            NUMERIC(12,2) NOT NULL,
    total_factura        NUMERIC(12,2) NOT NULL,  -- subtotal + iva - isr

    -- Datos SAT (reservados para integración PAC futura)
    uuid_cfdi            VARCHAR(36),
    xml_cfdi             TEXT,
    pdf_url              VARCHAR(500),
    fecha_timbrado       TIMESTAMP WITH TIME ZONE,

    -- Auditoría
    creado_por_id        INTEGER,
    creado_por_nombre    VARCHAR(255),
    notas                TEXT,
    motivo_cancelacion   TEXT,
    fecha_creacion       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_modificacion   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.facturas IS 'Registro de facturas CFDI 4.0. Puede originarse de una venta, pedido o cotización.';

CREATE INDEX IF NOT EXISTS idx_facturas_venta      ON public.facturas(venta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pedido     ON public.facturas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cotizacion ON public.facturas(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente    ON public.facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estatus    ON public.facturas(estatus);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha      ON public.facturas(fecha_creacion DESC);

-- FK: pos_ventas.factura_id → facturas
ALTER TABLE ONLY public.pos_ventas
    ADD CONSTRAINT fk_pos_ventas_factura FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE SET NULL;

-- FK: pos_cotizaciones.factura_id → facturas
ALTER TABLE ONLY public.pos_cotizaciones
    ADD CONSTRAINT fk_cotizaciones_factura FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE SET NULL;

-- FK: pos_pedidos.factura_id → facturas
ALTER TABLE ONLY public.pos_pedidos
    ADD CONSTRAINT fk_pedidos_factura FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

