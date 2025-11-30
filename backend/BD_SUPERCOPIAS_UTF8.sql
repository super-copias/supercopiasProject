--
-- PostgreSQL database dump
--

\restrict sgFD7PvsI8kUHADJ9nQdODaLUD5jmnj4AkRrvjSW1hU59pu24RhngUu8IdcULB4

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS fk_usuarios_empleado;
ALTER TABLE IF EXISTS ONLY public.empleados DROP CONSTRAINT IF EXISTS fk_empleados_sucursal;
ALTER TABLE IF EXISTS ONLY public.empleados DROP CONSTRAINT IF EXISTS fk_empleados_puesto;
ALTER TABLE IF EXISTS ONLY public.empleados_modulos DROP CONSTRAINT IF EXISTS fk_empleados_modulos_empleado;
ALTER TABLE IF EXISTS ONLY public.eventos_personal DROP CONSTRAINT IF EXISTS eventos_personal_registrado_por_fkey;
ALTER TABLE IF EXISTS ONLY public.eventos_personal DROP CONSTRAINT IF EXISTS eventos_personal_empleado_id_fkey;
ALTER TABLE IF EXISTS ONLY public.eventos_personal DROP CONSTRAINT IF EXISTS eventos_personal_aprobado_por_fkey;
DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
DROP TRIGGER IF EXISTS trg_usuarios_auditoria ON public.usuarios;
DROP TRIGGER IF EXISTS trg_sucursales_updated_at ON public.sucursales;
DROP TRIGGER IF EXISTS trg_puestos_updated_at ON public.puestos;
DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON public.proveedores;
DROP TRIGGER IF EXISTS trg_proveedores_auditoria ON public.proveedores;
DROP TRIGGER IF EXISTS trg_eventos_updated_at ON public.eventos_personal;
DROP TRIGGER IF EXISTS trg_empleados_updated_at ON public.empleados;
DROP TRIGGER IF EXISTS trg_empleados_auditoria ON public.empleados;
DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
DROP TRIGGER IF EXISTS trg_clientes_auditoria ON public.clientes;
DROP INDEX IF EXISTS public.idx_usuarios_username;
DROP INDEX IF EXISTS public.idx_usuarios_role;
DROP INDEX IF EXISTS public.idx_usuarios_empleado_id;
DROP INDEX IF EXISTS public.idx_usuarios_email;
DROP INDEX IF EXISTS public.idx_usuarios_activo;
DROP INDEX IF EXISTS public.idx_usos_cfdi_codigo;
DROP INDEX IF EXISTS public.idx_sucursales_nombre;
DROP INDEX IF EXISTS public.idx_sucursales_activa;
DROP INDEX IF EXISTS public.idx_regimenes_fiscales_codigo;
DROP INDEX IF EXISTS public.idx_puestos_nombre;
DROP INDEX IF EXISTS public.idx_puestos_activo;
DROP INDEX IF EXISTS public.idx_proveedores_tipo;
DROP INDEX IF EXISTS public.idx_proveedores_rfc;
DROP INDEX IF EXISTS public.idx_proveedores_nombre;
DROP INDEX IF EXISTS public.idx_proveedores_email;
DROP INDEX IF EXISTS public.idx_proveedores_activo;
DROP INDEX IF EXISTS public.idx_modulos_clave;
DROP INDEX IF EXISTS public.idx_modulos_activo;
DROP INDEX IF EXISTS public.idx_metodos_pago_codigo;
DROP INDEX IF EXISTS public.idx_formas_pago_codigo;
DROP INDEX IF EXISTS public.idx_eventos_tipo;
DROP INDEX IF EXISTS public.idx_eventos_fecha;
DROP INDEX IF EXISTS public.idx_eventos_estado;
DROP INDEX IF EXISTS public.idx_eventos_empleado;
DROP INDEX IF EXISTS public.idx_estados_codigo;
DROP INDEX IF EXISTS public.idx_empleados_nombre;
DROP INDEX IF EXISTS public.idx_empleados_modulos_modulo;
DROP INDEX IF EXISTS public.idx_empleados_modulos_empleado_id;
DROP INDEX IF EXISTS public.idx_empleados_modulos_acceso;
DROP INDEX IF EXISTS public.idx_empleados_fecha_ingreso;
DROP INDEX IF EXISTS public.idx_empleados_email;
DROP INDEX IF EXISTS public.idx_empleados_activo;
DROP INDEX IF EXISTS public.idx_clientes_razon_social;
DROP INDEX IF EXISTS public.idx_clientes_email;
DROP INDEX IF EXISTS public.idx_clientes_codigo_postal;
DROP INDEX IF EXISTS public.idx_clientes_activo;
DROP INDEX IF EXISTS public.idx_auditoria_usuario_id;
DROP INDEX IF EXISTS public.idx_auditoria_tabla;
DROP INDEX IF EXISTS public.idx_auditoria_registro_id;
DROP INDEX IF EXISTS public.idx_auditoria_operacion;
DROP INDEX IF EXISTS public.idx_auditoria_fecha;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_username_key;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE IF EXISTS ONLY public.usos_cfdi DROP CONSTRAINT IF EXISTS usos_cfdi_pkey;
ALTER TABLE IF EXISTS ONLY public.usos_cfdi DROP CONSTRAINT IF EXISTS usos_cfdi_codigo_key;
ALTER TABLE IF EXISTS ONLY public.sucursales DROP CONSTRAINT IF EXISTS unique_sucursal_nombre;
ALTER TABLE IF EXISTS ONLY public.puestos DROP CONSTRAINT IF EXISTS unique_puesto_nombre;
ALTER TABLE IF EXISTS ONLY public.empleados_modulos DROP CONSTRAINT IF EXISTS uk_empleados_modulos;
ALTER TABLE IF EXISTS ONLY public.sucursales DROP CONSTRAINT IF EXISTS sucursales_pkey;
ALTER TABLE IF EXISTS ONLY public.regimenes_fiscales DROP CONSTRAINT IF EXISTS regimenes_fiscales_pkey;
ALTER TABLE IF EXISTS ONLY public.regimenes_fiscales DROP CONSTRAINT IF EXISTS regimenes_fiscales_codigo_key;
ALTER TABLE IF EXISTS ONLY public.puestos DROP CONSTRAINT IF EXISTS puestos_pkey;
ALTER TABLE IF EXISTS ONLY public.proveedores DROP CONSTRAINT IF EXISTS proveedores_pkey;
ALTER TABLE IF EXISTS ONLY public.modulos DROP CONSTRAINT IF EXISTS modulos_pkey;
ALTER TABLE IF EXISTS ONLY public.modulos DROP CONSTRAINT IF EXISTS modulos_clave_key;
ALTER TABLE IF EXISTS ONLY public.metodos_pago DROP CONSTRAINT IF EXISTS metodos_pago_pkey;
ALTER TABLE IF EXISTS ONLY public.metodos_pago DROP CONSTRAINT IF EXISTS metodos_pago_codigo_key;
ALTER TABLE IF EXISTS ONLY public.formas_pago DROP CONSTRAINT IF EXISTS formas_pago_pkey;
ALTER TABLE IF EXISTS ONLY public.formas_pago DROP CONSTRAINT IF EXISTS formas_pago_codigo_key;
ALTER TABLE IF EXISTS ONLY public.eventos_personal DROP CONSTRAINT IF EXISTS eventos_personal_pkey;
ALTER TABLE IF EXISTS ONLY public.estados DROP CONSTRAINT IF EXISTS estados_pkey;
ALTER TABLE IF EXISTS ONLY public.estados DROP CONSTRAINT IF EXISTS estados_codigo_key;
ALTER TABLE IF EXISTS ONLY public.empleados DROP CONSTRAINT IF EXISTS empleados_pkey;
ALTER TABLE IF EXISTS ONLY public.empleados_modulos DROP CONSTRAINT IF EXISTS empleados_modulos_pkey;
ALTER TABLE IF EXISTS ONLY public.empleados DROP CONSTRAINT IF EXISTS empleados_email_key;
ALTER TABLE IF EXISTS ONLY public.clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE IF EXISTS ONLY public.auditoria DROP CONSTRAINT IF EXISTS auditoria_pkey;
ALTER TABLE IF EXISTS public.usuarios ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.usos_cfdi ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sucursales ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.regimenes_fiscales ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.puestos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.proveedores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.modulos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.metodos_pago ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.formas_pago ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.eventos_personal ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.estados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.empleados_modulos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.empleados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clientes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.auditoria ALTER COLUMN id DROP DEFAULT;
DROP VIEW IF EXISTS public.vista_empleados_completa;
DROP VIEW IF EXISTS public.vista_clientes_activos;
DROP VIEW IF EXISTS public.vacaciones_resumen;
DROP SEQUENCE IF EXISTS public.usuarios_id_seq;
DROP TABLE IF EXISTS public.usuarios;
DROP SEQUENCE IF EXISTS public.usos_cfdi_id_seq;
DROP TABLE IF EXISTS public.usos_cfdi;
DROP SEQUENCE IF EXISTS public.sucursales_id_seq;
DROP TABLE IF EXISTS public.sucursales;
DROP SEQUENCE IF EXISTS public.regimenes_fiscales_id_seq;
DROP TABLE IF EXISTS public.regimenes_fiscales;
DROP SEQUENCE IF EXISTS public.puestos_id_seq;
DROP TABLE IF EXISTS public.puestos;
DROP SEQUENCE IF EXISTS public.proveedores_id_seq;
DROP TABLE IF EXISTS public.proveedores;
DROP SEQUENCE IF EXISTS public.modulos_id_seq;
DROP TABLE IF EXISTS public.modulos;
DROP SEQUENCE IF EXISTS public.metodos_pago_id_seq;
DROP TABLE IF EXISTS public.metodos_pago;
DROP SEQUENCE IF EXISTS public.formas_pago_id_seq;
DROP TABLE IF EXISTS public.formas_pago;
DROP SEQUENCE IF EXISTS public.eventos_personal_id_seq;
DROP TABLE IF EXISTS public.eventos_personal;
DROP SEQUENCE IF EXISTS public.estados_id_seq;
DROP TABLE IF EXISTS public.estados;
DROP SEQUENCE IF EXISTS public.empleados_modulos_id_seq;
DROP TABLE IF EXISTS public.empleados_modulos;
DROP SEQUENCE IF EXISTS public.empleados_id_seq;
DROP TABLE IF EXISTS public.empleados;
DROP SEQUENCE IF EXISTS public.clientes_id_seq;
DROP TABLE IF EXISTS public.clientes;
DROP SEQUENCE IF EXISTS public.auditoria_id_seq;
DROP TABLE IF EXISTS public.auditoria;
DROP FUNCTION IF EXISTS public.trigger_updated_at();
DROP FUNCTION IF EXISTS public.trigger_eventos_updated_at();
DROP FUNCTION IF EXISTS public.trigger_auditoria();
DROP FUNCTION IF EXISTS public.obtener_estadisticas_generales();
DROP FUNCTION IF EXISTS public.generar_username(p_nombre character varying);
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


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

    

    -- Buscar siguiente n├â┬║mero disponible

    LOOP

        final_username := LPAD(counter::text, 3, '0') || '.' || base_username;

        

        IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN

            EXIT;

        END IF;

        

        counter := counter + 1;

        

        -- Expandir a 4 d├â┬¡gitos si es necesario

        IF counter > 999 THEN

            final_username := LPAD(counter::text, 4, '0') || '.' || base_username;

            IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN

                EXIT;

            END IF;

        END IF;

        

        -- L├â┬¡mite de seguridad

        IF counter > 9999 THEN

            RAISE EXCEPTION 'No se puede generar username ├â┬║nico para: %', p_nombre;

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

BEGIN

    IF TG_OP = 'DELETE' THEN

        INSERT INTO auditoria (tabla, operacion, registro_id, datos_anteriores)

        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD));

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN

        INSERT INTO auditoria (tabla, operacion, registro_id, datos_anteriores, datos_nuevos)

        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD), row_to_json(NEW));

        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN

        INSERT INTO auditoria (tabla, operacion, registro_id, datos_nuevos)

        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW));

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
    id integer NOT NULL,
    tabla character varying(100) NOT NULL,
    operacion character varying(20) NOT NULL,
    registro_id integer NOT NULL,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    usuario_id integer,
    ip_address inet,
    fecha_operacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_auditoria_operacion CHECK (((operacion)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text])))
);


--
-- Name: TABLE auditoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auditoria IS 'Registro completo de operaciones para auditor├â┬¡a';


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

COMMENT ON TABLE public.clientes IS 'Base de datos de clientes con informaci├â┬│n fiscal';


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
    CONSTRAINT empleados_turno_check CHECK (((turno)::text = ANY ((ARRAY['Matutino'::character varying, 'Vespertino'::character varying])::text[])))
);


--
-- Name: TABLE empleados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.empleados IS 'Informaci├â┬│n completa de empleados de la empresa';


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

COMMENT ON TABLE public.empleados_modulos IS 'Permisos granulares por m├â┬│dulo para cada empleado';


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
    CONSTRAINT eventos_personal_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobado'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT eventos_personal_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['vacaciones'::character varying, 'falta'::character varying, 'permiso'::character varying, 'otro'::character varying])::text[])))
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

COMMENT ON COLUMN public.eventos_personal.subtipo IS 'Clasificaci├â┬│n adicional seg├â┬║n el tipo (ej: enfermedad, personal, capacitaci├â┬│n)';


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
    CONSTRAINT chk_proveedores_email CHECK (((email IS NULL) OR ((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT chk_proveedores_rfc CHECK (((rfc IS NULL) OR (length((rfc)::text) = ANY (ARRAY[12, 13])))),
    CONSTRAINT chk_proveedores_tipo CHECK (((tipo_proveedor)::text = ANY (ARRAY[('Productos'::character varying)::text, ('Servicios'::character varying)::text, ('Mixto'::character varying)::text]))),
    CONSTRAINT chk_proveedores_dias_credito CHECK ((dias_credito >= 0))
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

COMMENT ON TABLE public.puestos IS 'Cat├â┬ílogo de puestos de trabajo';


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
    CONSTRAINT chk_usuarios_email CHECK (((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_usuarios_role CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('gerente'::character varying)::text, ('empleado'::character varying)::text, ('invitado'::character varying)::text])))
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema con autenticaci├â┬│n y autorizaci├â┬│n';


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

COMMENT ON VIEW public.vacaciones_resumen IS 'Vista de resumen de vacaciones por empleado para el a├â┬▒o actual';


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
-- Name: metodos_pago id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metodos_pago ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_id_seq'::regclass);


--
-- Name: cat_tipos_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_proveedor ALTER COLUMN id SET DEFAULT nextval('public.cat_tipos_proveedor_id_seq'::regclass);


--
-- Name: cat_metodos_pago_proveedor id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodos_pago_proveedor ALTER COLUMN id SET DEFAULT nextval('public.cat_metodos_pago_proveedor_id_seq'::regclass);


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
177	clientes	INSERT	2	\N	{"id": 2, "rfc": "CLE920615B84", "email": "ventas@papeleriamundial.com", "activo": true, "telefono": "961-200-0002", "uso_cfdi": "G01", "razon_social": "Colegio Le├│n XIII A.C.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "603", "nombre_comercial": "Colegio Le├│n XIII", "segundo_telefono": null, "direccion_entrega": "Blvd. Belisario Dom├¡nguez, 789, Jardines de Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29020"}	\N	\N	2025-11-26 20:37:53.986761-06
178	clientes	INSERT	3	\N	{"id": 3, "rfc": "OCH010228C93", "email": "info@oficinaschiapas.com", "activo": true, "telefono": "961-200-0003", "uso_cfdi": "G03", "razon_social": "Oficinas Chiapas, S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Oficinas Chiapas", "segundo_telefono": null, "direccion_entrega": "3ra. Avenida Norte Oriente, 1515, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 20:37:53.986761-06
179	clientes	INSERT	4	\N	{"id": 4, "rfc": "SII150810D45", "email": "gerencia@copiasistmo.com", "activo": true, "telefono": "961-200-0004", "uso_cfdi": "G03", "razon_social": "Servicios de Impresi├│n del Istmo S.A.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Copiasistmo", "segundo_telefono": null, "direccion_entrega": "Calle Primera Norte, 654, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 20:37:53.986761-06
180	clientes	INSERT	5	\N	{"id": 5, "rfc": "CSP180920E56", "email": "contacto@consultoresmaya.com", "activo": true, "telefono": "961-200-0005", "uso_cfdi": "G01", "razon_social": "Consultor├¡a y Servicios Profesionales Maya S.C.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "612", "nombre_comercial": "Consultores Maya", "segundo_telefono": null, "direccion_entrega": "Av. Universidad, 321, Universitaria, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29050"}	\N	\N	2025-11-26 20:37:53.986761-06
181	clientes	INSERT	6	\N	{"id": 6, "rfc": "GAD190531F67", "email": "info@gonzalezabogados.com", "activo": true, "telefono": "961-200-0006", "uso_cfdi": "G01", "razon_social": "Gonz├ílez y Asociados Despacho Jur├¡dico S.C.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "612", "nombre_comercial": "Despacho Jur├¡dico Gonz├ílez", "segundo_telefono": null, "direccion_entrega": "Calle Primera Norte, 789, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 20:37:53.986761-06
182	clientes	INSERT	7	\N	{"id": 7, "rfc": "DCH170215G78", "email": "ventas@districhiapas.com", "activo": true, "telefono": "961-200-0007", "uso_cfdi": "G03", "razon_social": "Distribuidora de Chiapas S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Distribuidora Chiapas", "segundo_telefono": null, "direccion_entrega": "Blvd. Los Castillos, 456, Las Flores, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29020"}	\N	\N	2025-11-26 20:37:53.986761-06
183	clientes	INSERT	8	\N	{"id": 8, "rfc": "CSM140815H89", "email": "proyectos@constructoradelsur.com", "activo": true, "telefono": "961-200-0008", "uso_cfdi": "G03", "razon_social": "Constructora del Sur de M├®xico S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Constructora del Sur", "segundo_telefono": null, "direccion_entrega": "Libramiento Norte Poniente, 2500, Plan de Ayala, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29010"}	\N	\N	2025-11-26 20:37:53.986761-06
184	clientes	INSERT	9	\N	{"id": 9, "rfc": "ICP111020I90", "email": "informes@icpsureste.edu.mx", "activo": true, "telefono": "961-200-0009", "uso_cfdi": "D10", "razon_social": "Instituto de Capacitaci├│n Profesional del Sureste A.C.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "603", "nombre_comercial": "ICP Sureste", "segundo_telefono": null, "direccion_entrega": "Calle Central Oriente, 1200, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 20:37:53.986761-06
185	clientes	INSERT	10	\N	{"id": 10, "rfc": "OAL160305J01", "email": "reservas@lacasonatgz.com", "activo": true, "telefono": "961-200-0010", "uso_cfdi": "G03", "razon_social": "Operadora de Alimentos La Casona S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Restaurante La Casona", "segundo_telefono": null, "direccion_entrega": "Av. Central Poniente, 850, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 20:37:53.986761-06
186	clientes	INSERT	12	\N	{"id": 12, "rfc": "HST120915L23", "email": "reservaciones@hotelegecutivotgz.com", "activo": true, "telefono": "961-200-0012", "uso_cfdi": "G01", "razon_social": "Hotelera y Servicios Tur├¡sticos del Grijalva S.A.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Hotel Ejecutivo Plaza", "segundo_telefono": null, "direccion_entrega": "Blvd. Belisario Dom├¡nguez, 1450, Moctezuma, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29030"}	\N	\N	2025-11-26 20:37:53.986761-06
187	clientes	INSERT	13	\N	{"id": 13, "rfc": "CPA191105M34", "email": "contacto@creativostgz.com", "activo": true, "telefono": "961-200-0013", "uso_cfdi": "G03", "razon_social": "Creativos y Publicistas Asociados S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Agencia Creativa TGZ", "segundo_telefono": null, "direccion_entrega": "Calle 2da. Poniente Sur, 234, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 20:37:53.986761-06
188	clientes	INSERT	1	\N	{"id": 1, "rfc": "SUR850315A72", "email": "contacto@serviciosses.com", "activo": true, "telefono": "961-200-0001", "uso_cfdi": "G03", "razon_social": "del Sureste S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Papeler├¡a Mundial", "segundo_telefono": "65674663883", "direccion_entrega": "reforma 222", "fecha_modificacion": "2025-10-15T23:01:12.836429-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29020"}	\N	\N	2025-11-26 20:38:23.684112-06
189	clientes	INSERT	22	\N	{"id": 22, "rfc": "PEGJ850315ABC", "email": "juan.perez@email.com", "activo": true, "telefono": "9611234567", "uso_cfdi": "G03", "razon_social": "Juan P├®rez Garc├¡a", "segundo_email": null, "fecha_registro": "2025-10-15T23:26:43.721052-06:00", "regimen_fiscal": "612", "nombre_comercial": "Juan P├®rez Garc├¡a", "segundo_telefono": "9611234568", "direccion_entrega": "Av. Central 123, Col. Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T23:26:43.721052-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 20:38:23.684112-06
190	clientes	INSERT	23	\N	{"id": 23, "rfc": "CLS920810XYZ", "email": null, "activo": true, "telefono": "9612345678", "uso_cfdi": "G01", "razon_social": "Comercializadora L├│pez S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T23:26:43.726086-06:00", "regimen_fiscal": "601", "nombre_comercial": "Comercializadora L├│pez S.A. de C.V.", "segundo_telefono": null, "direccion_entrega": "Blvd. Belisario Dom├¡nguez 456, Col. Moctezuma, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T23:26:43.726086-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29030"}	\N	\N	2025-11-26 20:38:23.684112-06
191	clientes	INSERT	24	\N	{"id": 24, "rfc": "GOHM750425DEF", "email": "maria.gonzalez@email.com", "activo": true, "telefono": "9673456789", "uso_cfdi": "G03", "razon_social": "Mar├¡a Gonz├ílez Hern├índez", "segundo_email": null, "fecha_registro": "2025-10-15T23:26:43.727255-06:00", "regimen_fiscal": "612", "nombre_comercial": "Mar├¡a Gonz├ílez Hern├índez", "segundo_telefono": "9673456790", "direccion_entrega": "Real de Guadalupe 789, Centro, San Crist├│bal de las Casas, Chiapas", "fecha_modificacion": "2025-10-15T23:26:43.727255-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29200"}	\N	\N	2025-11-26 20:38:23.684112-06
192	usuarios	UPDATE	1	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$T1AaTiFCWAt.ubexs.QkreJSTQRKRjPy2VeyQXCslX82feThi9tuW", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": "", "ultimo_acceso": "2025-10-16T01:28:05.615298-06:00", "fecha_registro": "2025-10-11T23:09:08.738514-06:00", "fecha_modificacion": "2025-10-16T01:28:05.615298-06:00"}	{"id": 1, "bio": "Administrador principal del sistema SuperCopias", "role": "admin", "email": "admin@supercopias.com", "phone": "+52 961 100 0000", "roles": ["admin"], "activo": true, "nombre": "Administrador SuperCopias", "password": "$2a$10$T1AaTiFCWAt.ubexs.QkreJSTQRKRjPy2VeyQXCslX82feThi9tuW", "username": "admin", "full_name": "Administrador SuperCopias", "empleado_id": null, "profile_image": "", "ultimo_acceso": "2025-11-26T20:40:29.290684-06:00", "fecha_registro": "2025-10-11T23:09:08.738514-06:00", "fecha_modificacion": "2025-11-26T20:40:29.290684-06:00"}	\N	\N	2025-11-26 20:40:29.290684-06
193	clientes	UPDATE	12	{"id": 12, "rfc": "HST120915L23", "email": "reservaciones@hotelegecutivotgz.com", "activo": true, "telefono": "961-200-0012", "uso_cfdi": "G01", "razon_social": "Hotelera y Servicios Tur├¡sticos del Grijalva S.A.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Hotel Ejecutivo Plaza", "segundo_telefono": null, "direccion_entrega": "Blvd. Belisario Dom├¡nguez, 1450, Moctezuma, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29030"}	{"id": 12, "rfc": "HST120915L23", "email": "reservaciones@hotelegecutivotgz.com", "activo": false, "telefono": "961-200-0012", "uso_cfdi": "G01", "razon_social": "Hotelera y Servicios Tur├¡sticos del Grijalva S.A.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Hotel Ejecutivo Plaza", "segundo_telefono": null, "direccion_entrega": "Blvd. Belisario Dom├¡nguez, 1450, Moctezuma, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-11-26T21:38:04.713301-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29030"}	\N	\N	2025-11-26 21:38:04.713301-06
194	clientes	UPDATE	10	{"id": 10, "rfc": "OAL160305J01", "email": "reservas@lacasonatgz.com", "activo": true, "telefono": "961-200-0010", "uso_cfdi": "G03", "razon_social": "Operadora de Alimentos La Casona S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Restaurante La Casona", "segundo_telefono": null, "direccion_entrega": "Av. Central Poniente, 850, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-10-15T01:38:22.089808-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	{"id": 10, "rfc": "OAL160305J01", "email": "reservas@lacasonatgz.com", "activo": false, "telefono": "961-200-0010", "uso_cfdi": "G03", "razon_social": "Operadora de Alimentos La Casona S.A. de C.V.", "segundo_email": null, "fecha_registro": "2025-10-15T01:38:22.089808-06:00", "regimen_fiscal": "601", "nombre_comercial": "Restaurante La Casona", "segundo_telefono": null, "direccion_entrega": "Av. Central Poniente, 850, Centro, Tuxtla Guti├®rrez, Chiapas", "fecha_modificacion": "2025-11-26T21:38:47.96281-06:00", "direccion_facturacion": null, "direccion_codigo_postal": "29000"}	\N	\N	2025-11-26 21:38:47.96281-06
195	empleados	UPDATE	1	{"id": 1, "email": "admin@supercopias.com", "turno": null, "activo": true, "nombre": "Administrador Sistema", "salario": 30000.00, "telefono": "555-1000", "puesto_id": 1, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "completo", "fecha_ingreso": "2024-01-01", "fecha_registro": "2025-10-11T23:09:08.734609-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-10-11T23:09:08.734609-06:00", "dias_vacaciones_sugeridos": 12}	{"id": 1, "email": "admin@supercopias.com", "turno": "Matutino", "activo": true, "nombre": "Administrador Sistema", "salario": 30000.00, "telefono": "555-1000", "puesto_id": 1, "fecha_baja": null, "usuario_id": null, "sucursal_id": 1, "tipo_acceso": "completo", "fecha_ingreso": "2024-01-01", "fecha_registro": "2025-10-11T23:09:08.734609-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-11-26T23:40:37.259162-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-11-26 23:40:37.259162-06
196	empleados	UPDATE	24	{"id": 24, "email": "dfsd@gmail.com", "turno": null, "activo": true, "nombre": "jhonatan", "salario": 5656.00, "telefono": "234823423", "puesto_id": 7, "fecha_baja": null, "usuario_id": 19, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2025-10-16", "fecha_registro": "2025-10-16T00:44:55.672798-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-10-16T00:44:55.740268-06:00", "dias_vacaciones_sugeridos": 12}	{"id": 24, "email": "dfsd@gmail.com", "turno": "Matutino", "activo": true, "nombre": "jhonatan", "salario": 5656.00, "telefono": "234823423", "puesto_id": 7, "fecha_baja": null, "usuario_id": 19, "sucursal_id": 1, "tipo_acceso": "limitado", "fecha_ingreso": "2025-10-16", "fecha_registro": "2025-10-16T00:44:55.672798-06:00", "notas_vacaciones": null, "fecha_modificacion": "2025-11-26T23:40:37.259162-06:00", "dias_vacaciones_sugeridos": 12}	\N	\N	2025-11-26 23:40:37.259162-06
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clientes (id, rfc, razon_social, nombre_comercial, email, telefono, direccion_codigo_postal, regimen_fiscal, uso_cfdi, activo, fecha_registro, fecha_modificacion, direccion_entrega, direccion_facturacion, segundo_telefono, segundo_email) FROM stdin;
2	CLE920615B84	Colegio Le├│n XIII A.C.	Colegio Le├│n XIII	ventas@papeleriamundial.com	961-200-0002	29020	603	G01	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Blvd. Belisario Dom├¡nguez, 789, Jardines de Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
3	OCH010228C93	Oficinas Chiapas, S.A. de C.V.	Oficinas Chiapas	info@oficinaschiapas.com	961-200-0003	29000	601	G03	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	3ra. Avenida Norte Oriente, 1515, Centro, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
4	SII150810D45	Servicios de Impresi├│n del Istmo S.A.	Copiasistmo	gerencia@copiasistmo.com	961-200-0004	29000	601	G03	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Calle Primera Norte, 654, Centro, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
5	CSP180920E56	Consultor├¡a y Servicios Profesionales Maya S.C.	Consultores Maya	contacto@consultoresmaya.com	961-200-0005	29050	612	G01	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Av. Universidad, 321, Universitaria, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
6	GAD190531F67	Gonz├ílez y Asociados Despacho Jur├¡dico S.C.	Despacho Jur├¡dico Gonz├ílez	info@gonzalezabogados.com	961-200-0006	29000	612	G01	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Calle Primera Norte, 789, Centro, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
7	DCH170215G78	Distribuidora de Chiapas S.A. de C.V.	Distribuidora Chiapas	ventas@districhiapas.com	961-200-0007	29020	601	G03	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Blvd. Los Castillos, 456, Las Flores, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
8	CSM140815H89	Constructora del Sur de M├®xico S.A. de C.V.	Constructora del Sur	proyectos@constructoradelsur.com	961-200-0008	29010	601	G03	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Libramiento Norte Poniente, 2500, Plan de Ayala, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
9	ICP111020I90	Instituto de Capacitaci├│n Profesional del Sureste A.C.	ICP Sureste	informes@icpsureste.edu.mx	961-200-0009	29000	603	D10	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Calle Central Oriente, 1200, Centro, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
13	CPA191105M34	Creativos y Publicistas Asociados S.A. de C.V.	Agencia Creativa TGZ	contacto@creativostgz.com	961-200-0013	29000	601	G03	t	2025-10-15 01:38:22.089808-06	2025-10-15 01:38:22.089808-06	Calle 2da. Poniente Sur, 234, Centro, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
1	SUR850315A72	del Sureste S.A. de C.V.	Papeler├¡a Mundial	contacto@serviciosses.com	961-200-0001	29020	601	G03	t	2025-10-15 01:38:22.089808-06	2025-10-15 23:01:12.836429-06	reforma 222	\N	65674663883	\N
22	PEGJ850315ABC	Juan P├®rez Garc├¡a	Juan P├®rez Garc├¡a	juan.perez@email.com	9611234567	29000	612	G03	t	2025-10-15 23:26:43.721052-06	2025-10-15 23:26:43.721052-06	Av. Central 123, Col. Centro, Tuxtla Guti├®rrez, Chiapas	\N	9611234568	\N
23	CLS920810XYZ	Comercializadora L├│pez S.A. de C.V.	Comercializadora L├│pez S.A. de C.V.	\N	9612345678	29030	601	G01	t	2025-10-15 23:26:43.726086-06	2025-10-15 23:26:43.726086-06	Blvd. Belisario Dom├¡nguez 456, Col. Moctezuma, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
24	GOHM750425DEF	Mar├¡a Gonz├ílez Hern├índez	Mar├¡a Gonz├ílez Hern├índez	maria.gonzalez@email.com	9673456789	29200	612	G03	t	2025-10-15 23:26:43.727255-06	2025-10-15 23:26:43.727255-06	Real de Guadalupe 789, Centro, San Crist├│bal de las Casas, Chiapas	\N	9673456790	\N
12	HST120915L23	Hotelera y Servicios Tur├¡sticos del Grijalva S.A.	Hotel Ejecutivo Plaza	reservaciones@hotelegecutivotgz.com	961-200-0012	29030	601	G01	f	2025-10-15 01:38:22.089808-06	2025-11-26 21:38:04.713301-06	Blvd. Belisario Dom├¡nguez, 1450, Moctezuma, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
10	OAL160305J01	Operadora de Alimentos La Casona S.A. de C.V.	Restaurante La Casona	reservas@lacasonatgz.com	961-200-0010	29000	601	G03	f	2025-10-15 01:38:22.089808-06	2025-11-26 21:38:47.96281-06	Av. Central Poniente, 850, Centro, Tuxtla Guti├®rrez, Chiapas	\N	\N	\N
\.


--
-- Data for Name: empleados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empleados (id, nombre, email, telefono, puesto_id, sucursal_id, salario, fecha_ingreso, activo, fecha_baja, fecha_registro, fecha_modificacion, tipo_acceso, usuario_id, dias_vacaciones_sugeridos, notas_vacaciones, turno) FROM stdin;
1	Administrador Sistema	admin@supercopias.com	555-1000	1	1	30000.00	2024-01-01	t	\N	2025-10-11 23:09:08.734609-06	2025-11-26 23:40:37.259162-06	completo	\N	12	\N	Matutino
24	jhonatan	dfsd@gmail.com	234823423	7	1	5656.00	2025-10-16	t	\N	2025-10-16 00:44:55.672798-06	2025-11-26 23:40:37.259162-06	limitado	19	12	\N	Matutino
\.


--
-- Data for Name: empleados_modulos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.empleados_modulos (id, empleado_id, modulo, acceso, fecha_asignacion) FROM stdin;
1	1	empleados	t	2025-10-11 23:09:08.739992-06
2	1	clientes	t	2025-10-11 23:09:08.739992-06
3	1	proveedores	t	2025-10-11 23:09:08.739992-06
4	1	reportes	t	2025-10-11 23:09:08.739992-06
5	1	configuracion	t	2025-10-11 23:09:08.739992-06
6	1	administracion	t	2025-10-11 23:09:08.739992-06
173	24	dashboard	t	2025-10-16 00:44:55.677187-06
174	24	empleados	t	2025-10-16 00:44:55.678129-06
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
7	CMX	Ciudad de M├®xico	t	2025-10-11 23:12:28.256365-06
8	COA	Coahuila	t	2025-10-11 23:12:28.256719-06
9	COL	Colima	t	2025-10-11 23:12:28.257117-06
10	DUR	Durango	t	2025-10-11 23:12:28.257457-06
11	MEX	Estado de M├®xico	t	2025-10-11 23:12:28.25775-06
12	GUA	Guanajuato	t	2025-10-11 23:12:28.258022-06
13	GRO	Guerrero	t	2025-10-11 23:12:28.258374-06
14	HID	Hidalgo	t	2025-10-11 23:12:28.258653-06
15	JAL	Jalisco	t	2025-10-11 23:12:28.258915-06
16	MIC	Michoac├ín	t	2025-10-11 23:12:28.259192-06
17	MOR	Morelos	t	2025-10-11 23:12:28.259478-06
18	NAY	Nayarit	t	2025-10-11 23:12:28.259742-06
19	NLE	Nuevo Le├│n	t	2025-10-11 23:12:28.260003-06
20	OAX	Oaxaca	t	2025-10-11 23:12:28.260275-06
21	PUE	Puebla	t	2025-10-11 23:12:28.260537-06
22	QUE	Quer├®taro	t	2025-10-11 23:12:28.260835-06
23	ROO	Quintana Roo	t	2025-10-11 23:12:28.261167-06
24	SLP	San Luis Potos├¡	t	2025-10-11 23:12:28.261488-06
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
2	24	falta	2025-11-01	\N	\N	\N	\N	1	otro	aprobado	f	f	prueba 	prueba	\N	1	\N	2025-11-26 21:32:17.478272	\N	2025-11-26 21:32:17.478272	2025-11-26 21:32:17.478272
3	24	permiso	2025-11-28	\N	08:37:00	20:40:00	12.05	\N	otro	pendiente	\N	t	prueba 	\N	\N	1	\N	2025-11-26 21:35:37.053205	\N	2025-11-26 21:35:37.053205	2025-11-26 21:35:37.053205
\.


--
-- Data for Name: formas_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.formas_pago (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	01	Efectivo	t	2025-10-11 23:12:28.279051-06
2	02	Cheque nominativo	t	2025-10-11 23:12:28.280649-06
3	03	Transferencia electr├│nica de fondos	t	2025-10-11 23:12:28.280916-06
4	04	Tarjeta de cr├®dito	t	2025-10-11 23:12:28.281169-06
5	05	Monedero electr├│nico	t	2025-10-11 23:12:28.281417-06
6	06	Dinero electr├│nico	t	2025-10-11 23:12:28.281718-06
7	08	Vales de despensa	t	2025-10-11 23:12:28.282009-06
8	12	Daci├│n en pago	t	2025-10-11 23:12:28.282325-06
9	13	Pago por subrogaci├│n	t	2025-10-11 23:12:28.282589-06
10	14	Pago por consignaci├│n	t	2025-10-11 23:12:28.282894-06
11	15	Condonaci├│n	t	2025-10-11 23:12:28.283165-06
12	17	Compensaci├│n	t	2025-10-11 23:12:28.283415-06
13	23	Novaci├│n	t	2025-10-11 23:12:28.283663-06
14	24	Confusi├│n	t	2025-10-11 23:12:28.283985-06
15	25	Remisi├│n de deuda	t	2025-10-11 23:12:28.284295-06
16	26	Prescripci├│n o caducidad	t	2025-10-11 23:12:28.284574-06
17	27	A satisfacci├│n del acreedor	t	2025-10-11 23:12:28.284831-06
18	28	Tarjeta de d├®bito	t	2025-10-11 23:12:28.28508-06
19	29	Tarjeta de servicios	t	2025-10-11 23:12:28.285327-06
20	30	Aplicaci├│n de anticipos	t	2025-10-11 23:12:28.285579-06
21	31	Intermediario pagos	t	2025-10-11 23:12:28.285824-06
22	99	Por definir	t	2025-10-11 23:12:28.286069-06
\.


--
-- Data for Name: metodos_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.metodos_pago (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	PUE	Pago en una sola exhibici├│n	t	2025-10-11 23:12:28.286448-06
2	PPD	Pago en parcialidades o diferido	t	2025-10-11 23:12:28.287972-06
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
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.modulos (id, clave, nombre, icono, activo, orden, fecha_creacion) FROM stdin;
1	dashboard	Dashboard	fas fa-tachometer-alt	t	0	2025-10-11 23:12:28.28835-06
2	empleados	Empleados	fas fa-users	t	0	2025-10-11 23:12:28.290377-06
3	clientes	Clientes	fas fa-user-friends	t	0	2025-10-11 23:12:28.290694-06
4	proveedores	Proveedores	fas fa-truck	t	0	2025-10-11 23:12:28.29097-06
5	inventarios	Inventarios	fas fa-boxes	t	0	2025-10-11 23:12:28.291232-06
6	equipos	Equipos	fas fa-tools	t	0	2025-10-11 23:12:28.291492-06
7	reportes	Reportes	fas fa-chart-bar	t	0	2025-10-11 23:12:28.29175-06
8	punto_venta	Punto de Venta	fas fa-cash-register	t	0	2025-10-11 23:12:28.292027-06
9	configuracion	Configuraci├│n	fas fa-cogs	f	0	2025-10-11 23:12:28.292289-06
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proveedores (id, nombre_comercial, razon_social, rfc, tipo_proveedor, activo, nombre_contacto, telefono, email, pagina_web, direccion, metodo_pago_principal, cuenta_bancaria, dias_credito, notas, fecha_registro, fecha_modificacion) FROM stdin;
1	Papelería El Estudiante	Papelería El Estudiante S.A. de C.V.	PES910315ABC	Productos	t	María González	555-1001	ventas@estudiantepapeleria.com	www.papeleriaestudiante.com	Av. Universidad 123, Col. Centro, Ciudad de México, CDMX, 06000, México	Transferencia	012345678901234567	30	Proveedor principal de papelería y suministros de oficina	2023-01-09 18:00:00-06	\N
2	Tecnología y Sistemas	Tecnología y Sistemas S.A. de C.V.	TYS850420DEF	Servicios	t	Ing. Carlos Ramírez	555-1002	soporte@tecnologiasistemas.com	www.tecnologiaysistemas.com	Calle Tecnología 456, Col. Moderna, Ciudad de México, CDMX, 03100, México	Transferencia	\N	15	Mantenimiento de equipos de cómputo y redes	2023-02-04 18:00:00-06	\N
3	Limpieza Integral	Servicios de Limpieza Integral S.A. de C.V.	SLI780630GHI	Servicios	t	Patricia Herrera	555-1003	admin@limpiezaintegral.com	\N	Av. Servicios 789, Col. Industrial, Ciudad de México, CDMX, 07300, México	Efectivo	\N	0	Servicio de limpieza diario para oficinas	2023-03-11 18:00:00-06	\N
4	Toners Express	Insumos y Toners Express S.A. de C.V.	ITE920815JKL	Productos	t	Lic. Roberto Silva	555-1004	pedidos@tonersexpress.com	www.tonersexpress.com	Blvd. Insumos 321, Col. Comercial, Ciudad de México, CDMX, 06500, México	Transferencia	098765432109876543	45	Cartuchos, toners y consumibles para impresoras	2023-04-17 18:00:00-06	\N
5	Capacitación Pro	Capacitación Empresarial Pro S.C.	CEP870925MNO	Servicios	t	Mtra. Ana López	555-1005	cursos@capacitacionpro.com	www.capacitacionpro.com	Av. Capacitación 654, Col. Educativa, Ciudad de México, CDMX, 03900, México	Transferencia	\N	0	Cursos de desarrollo profesional y técnico	2023-05-21 18:00:00-06	\N
\.


--
-- Data for Name: puestos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.puestos (id, nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion, fecha_modificacion) FROM stdin;
1	Gerente General	Responsable de la operaci├â┬│n general	25000.00	35000.00	t	2025-10-11 23:09:08.733062-06	2025-10-11 23:09:08.733062-06
3	Supervisor	Supervisi├â┬│n de operaciones diarias	12000.00	18000.00	t	2025-10-11 23:09:08.733062-06	2025-10-11 23:09:08.733062-06
4	Empleado de Mostrador	Atenci├â┬│n directa al cliente	8000.00	12000.00	t	2025-10-11 23:09:08.733062-06	2025-10-11 23:09:08.733062-06
5	Cajero	Manejo de caja y cobros	8000.00	10000.00	t	2025-10-11 23:09:08.733062-06	2025-10-11 23:09:08.733062-06
2	Gerente de Sucursal	Responsable de la administraci├│n general de la sucursal	20000.00	35000.00	t	2025-10-11 23:09:08.733062-06	2025-10-11 23:18:16.918139-06
7	Asistente de Ventas	Apoyo en atenci├│n al cliente y ventas	12000.00	18000.00	t	2025-10-11 10:10:57.691-06	2025-10-11 23:18:16.919149-06
8	Auxiliar Administrativo	Apoyo en tareas administrativas y de oficina	10000.00	15000.00	t	2025-10-11 10:10:57.691-06	2025-10-11 23:18:16.919863-06
9	Operador de Equipos	Manejo y mantenimiento de equipos de copiado e impresi├│n	11000.00	16000.00	t	2025-10-11 10:10:57.691-06	2025-10-11 23:18:16.92042-06
\.


--
-- Data for Name: regimenes_fiscales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.regimenes_fiscales (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	601	General de Ley Personas Morales	t	2025-10-11 23:12:28.2644-06
2	603	Personas Morales con Fines no Lucrativos	t	2025-10-11 23:12:28.266054-06
3	605	Sueldos y Salarios e Ingresos Asimilados a Salarios	t	2025-10-11 23:12:28.266326-06
4	606	Arrendamiento	t	2025-10-11 23:12:28.266582-06
5	607	R├®gimen de Enajenaci├│n o Adquisici├│n de Bienes	t	2025-10-11 23:12:28.266836-06
6	608	Dem├ís ingresos	t	2025-10-11 23:12:28.267085-06
7	610	Residentes en el Extranjero sin Establecimiento Permanente en M├®xico	t	2025-10-11 23:12:28.267334-06
8	611	Ingresos por Dividendos (socios y accionistas)	t	2025-10-11 23:12:28.267579-06
9	612	Personas F├¡sicas con Actividades Empresariales y Profesionales	t	2025-10-11 23:12:28.267843-06
10	614	Ingresos por intereses	t	2025-10-11 23:12:28.268118-06
11	615	R├®gimen de los ingresos por obtenci├│n de premios	t	2025-10-11 23:12:28.268415-06
12	616	Sin obligaciones fiscales	t	2025-10-11 23:12:28.26881-06
13	620	Sociedades Cooperativas de Producci├│n que optan por diferir sus ingresos	t	2025-10-11 23:12:28.269139-06
14	621	Incorporaci├│n Fiscal	t	2025-10-11 23:12:28.269467-06
15	622	Actividades Agr├¡colas, Ganaderas, Silv├¡colas y Pesqueras	t	2025-10-11 23:12:28.269747-06
16	623	Opcional para Grupos de Sociedades	t	2025-10-11 23:12:28.270012-06
17	624	Coordinados	t	2025-10-11 23:12:28.270265-06
18	625	R├®gimen de las Actividades Empresariales con ingresos a trav├®s de Plataformas Tecnol├│gicas	t	2025-10-11 23:12:28.270519-06
19	626	R├®gimen Simplificado de Confianza	t	2025-10-11 23:12:28.270769-06
\.


--
-- Data for Name: sucursales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sucursales (id, nombre, direccion, telefono, gerente, activa, fecha_creacion, fecha_modificacion) FROM stdin;
1	Sucursal Centro	Centro de Tuxtla Guti├®rrez	961-100-1001	Mar├¡a G├│mez Hern├índez	t	2025-10-11 23:09:08.731227-06	2025-10-11 23:18:16.914451-06
2	Sucursal Norte	Norte de Tuxtla Guti├®rrez	961-100-1002	Juan P├®rez Mart├¡nez	t	2025-10-11 23:09:08.731227-06	2025-10-11 23:18:16.917174-06
3	Sucursal Sur	Sur de Tuxtla Guti├®rrez	961-100-1003	Ana L├│pez Silva	t	2025-10-11 23:09:08.731227-06	2025-10-11 23:18:16.917594-06
\.


--
-- Data for Name: usos_cfdi; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usos_cfdi (id, codigo, descripcion, activo, fecha_creacion) FROM stdin;
1	G01	Adquisici├│n de mercanc├¡as	t	2025-10-11 23:12:28.271148-06
2	G02	Devoluciones, descuentos o bonificaciones	t	2025-10-11 23:12:28.272833-06
3	G03	Gastos en general	t	2025-10-11 23:12:28.273095-06
4	I01	Construcciones	t	2025-10-11 23:12:28.273353-06
5	I02	Mobiliario y equipo de oficina por inversiones	t	2025-10-11 23:12:28.273602-06
6	I03	Equipo de transporte	t	2025-10-11 23:12:28.273847-06
7	I04	Equipo de c├│mputo y accesorios	t	2025-10-11 23:12:28.274093-06
8	I05	Dados, troqueles, moldes, matrices y herramental	t	2025-10-11 23:12:28.274337-06
9	I06	Comunicaciones telef├│nicas	t	2025-10-11 23:12:28.274586-06
10	I07	Comunicaciones satelitales	t	2025-10-11 23:12:28.27487-06
11	I08	Otra maquinaria y equipo	t	2025-10-11 23:12:28.275168-06
12	D01	Honorarios m├®dicos, dentales y gastos hospitalarios	t	2025-10-11 23:12:28.275478-06
13	D02	Gastos m├®dicos por incapacidad o discapacidad	t	2025-10-11 23:12:28.275744-06
14	D03	Gastos funerales	t	2025-10-11 23:12:28.276009-06
15	D04	Donativos	t	2025-10-11 23:12:28.276286-06
16	D05	Intereses reales efectivamente pagados por cr├®ditos hipotecarios	t	2025-10-11 23:12:28.276545-06
17	D06	Aportaciones voluntarias al SAR	t	2025-10-11 23:12:28.276799-06
18	D07	Primas por seguros de gastos m├®dicos	t	2025-10-11 23:12:28.277045-06
19	D08	Gastos de transportaci├│n escolar obligatoria	t	2025-10-11 23:12:28.277292-06
20	D09	Dep├│sitos en cuentas para el ahorro, primas que tengan como base planes de pensiones	t	2025-10-11 23:12:28.27754-06
21	D10	Pagos por servicios educativos (colegiaturas)	t	2025-10-11 23:12:28.277791-06
22	S01	Sin efectos fiscales	t	2025-10-11 23:12:28.278038-06
23	CP01	Pagos	t	2025-10-11 23:12:28.278364-06
24	CN01	N├│mina	t	2025-10-11 23:12:28.278617-06
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, username, password, nombre, email, role, roles, empleado_id, activo, fecha_registro, fecha_modificacion, ultimo_acceso, full_name, phone, bio, profile_image) FROM stdin;
19	001.Jhonatan	$2a$08$a5x.y3QbNF9tbBG/w6QT6u1X3fgQsI12GE4pYzshgM9uV.OFfGhBy	jhonatan	dfsd@gmail.com	empleado	["empleado"]	24	t	2025-10-16 00:44:55.739087-06	2025-10-16 01:28:36.43517-06	2025-10-16 01:28:36.43517-06	jhonatan	234823423	Empleado - Acceso personalizado	\N
1	admin	$2a$10$T1AaTiFCWAt.ubexs.QkreJSTQRKRjPy2VeyQXCslX82feThi9tuW	Administrador SuperCopias	admin@supercopias.com	admin	["admin"]	\N	t	2025-10-11 23:09:08.738514-06	2025-11-26 20:40:29.290684-06	2025-11-26 20:40:29.290684-06	Administrador SuperCopias	+52 961 100 0000	Administrador principal del sistema SuperCopias	
\.


--
-- Name: auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auditoria_id_seq', 196, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clientes_id_seq', 26, true);


--
-- Name: empleados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empleados_id_seq', 24, true);


--
-- Name: empleados_modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empleados_modulos_id_seq', 174, true);


--
-- Name: estados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estados_id_seq', 64, true);


--
-- Name: eventos_personal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.eventos_personal_id_seq', 3, true);


--
-- Name: formas_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.formas_pago_id_seq', 44, true);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.metodos_pago_id_seq', 4, true);


--
-- Name: cat_tipos_proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_tipos_proveedor_id_seq', 3, true);


--
-- Name: cat_metodos_pago_proveedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_metodos_pago_proveedor_id_seq', 6, true);


--
-- Name: modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modulos_id_seq', 18, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 10, true);


--
-- Name: puestos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.puestos_id_seq', 9, true);


--
-- Name: regimenes_fiscales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.regimenes_fiscales_id_seq', 38, true);


--
-- Name: sucursales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sucursales_id_seq', 6, true);


--
-- Name: usos_cfdi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usos_cfdi_id_seq', 48, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 19, true);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


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
-- Name: cat_tipos_proveedor cat_tipos_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_proveedor
    ADD CONSTRAINT cat_tipos_proveedor_pkey PRIMARY KEY (id);


--
-- Name: cat_tipos_proveedor cat_tipos_proveedor_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_tipos_proveedor
    ADD CONSTRAINT cat_tipos_proveedor_clave_key UNIQUE (clave);


--
-- Name: cat_metodos_pago_proveedor cat_metodos_pago_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodos_pago_proveedor
    ADD CONSTRAINT cat_metodos_pago_proveedor_pkey PRIMARY KEY (id);


--
-- Name: cat_metodos_pago_proveedor cat_metodos_pago_proveedor_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodos_pago_proveedor
    ADD CONSTRAINT cat_metodos_pago_proveedor_clave_key UNIQUE (clave);


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
-- Name: idx_metodos_pago_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_metodos_pago_codigo ON public.metodos_pago USING btree (codigo);


--
-- Name: idx_cat_tipos_proveedor_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_tipos_proveedor_activo ON public.cat_tipos_proveedor USING btree (activo);


--
-- Name: idx_cat_tipos_proveedor_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_tipos_proveedor_clave ON public.cat_tipos_proveedor USING btree (clave);


--
-- Name: idx_cat_metodos_pago_proveedor_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_metodos_pago_proveedor_activo ON public.cat_metodos_pago_proveedor USING btree (activo);


--
-- Name: idx_cat_metodos_pago_proveedor_clave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_metodos_pago_proveedor_clave ON public.cat_metodos_pago_proveedor USING btree (clave);


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
-- Name: idx_proveedores_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedores_nombre ON public.proveedores USING btree (nombre);


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
-- Name: usuarios fk_usuarios_empleado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_empleado FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- PostgreSQL database dump complete
--

\unrestrict sgFD7PvsI8kUHADJ9nQdODaLUD5jmnj4AkRrvjSW1hU59pu24RhngUu8IdcULB4

