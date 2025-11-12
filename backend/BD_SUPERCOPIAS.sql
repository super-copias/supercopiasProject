--
-- PostgreSQL database dump
--

\restrict yhvszANWIBnevEW2OGfZL8wCZX2g9jBK82unZARXabtwzavtpISlGz1JIpGbhGd

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
DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
DROP TRIGGER IF EXISTS trg_usuarios_auditoria ON public.usuarios;
DROP TRIGGER IF EXISTS trg_sucursales_updated_at ON public.sucursales;
DROP TRIGGER IF EXISTS trg_puestos_updated_at ON public.puestos;
DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON public.proveedores;
DROP TRIGGER IF EXISTS trg_proveedores_auditoria ON public.proveedores;
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
ALTER TABLE IF EXISTS public.estados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.empleados_modulos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.empleados ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clientes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.auditoria ALTER COLUMN id DROP DEFAULT;
DROP VIEW IF EXISTS public.vista_empleados_completa;
DROP VIEW IF EXISTS public.vista_clientes_activos;
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
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: generar_username(character varying); Type: FUNCTION; Schema: public; Owner: postgres
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
    
    -- Buscar siguiente nÃºmero disponible
    LOOP
        final_username := LPAD(counter::text, 3, '0') || '.' || base_username;
        
        IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN
            EXIT;
        END IF;
        
        counter := counter + 1;
        
        -- Expandir a 4 dÃ­gitos si es necesario
        IF counter > 999 THEN
            final_username := LPAD(counter::text, 4, '0') || '.' || base_username;
            IF NOT EXISTS (SELECT 1 FROM usuarios WHERE username = final_username) THEN
                EXIT;
            END IF;
        END IF;
        
        -- LÃ­mite de seguridad
        IF counter > 9999 THEN
            RAISE EXCEPTION 'No se puede generar username Ãºnico para: %', p_nombre;
        END IF;
    END LOOP;
    
    RETURN final_username;
END;
$$;


ALTER FUNCTION public.generar_username(p_nombre character varying) OWNER TO postgres;

--
-- Name: obtener_estadisticas_generales(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.obtener_estadisticas_generales() OWNER TO postgres;

--
-- Name: trigger_auditoria(); Type: FUNCTION; Schema: public; Owner: postgres
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


ALTER FUNCTION public.trigger_auditoria() OWNER TO postgres;

--
-- Name: trigger_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_modificacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_auditoria_operacion CHECK (((operacion)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying])::text[])))
);


ALTER TABLE public.auditoria OWNER TO postgres;

--
-- Name: TABLE auditoria; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.auditoria IS 'Registro completo de operaciones para auditorÃ­a';


--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auditoria_id_seq OWNER TO postgres;

--
-- Name: auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditoria_id_seq OWNED BY public.auditoria.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_clientes_email CHECK (((email IS NULL) OR ((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT chk_clientes_regimen_fiscal CHECK (((regimen_fiscal IS NULL) OR ((regimen_fiscal)::text ~ '^[0-9]{3}$'::text)))
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: TABLE clientes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.clientes IS 'Base de datos de clientes con informaciÃ³n fiscal';


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clientes_id_seq OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_empleados_email CHECK (((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT chk_empleados_fecha_baja CHECK (((fecha_baja IS NULL) OR (fecha_baja >= fecha_ingreso))),
    CONSTRAINT chk_empleados_tipo_acceso CHECK (((tipo_acceso)::text = ANY ((ARRAY['completo'::character varying, 'limitado'::character varying, 'solo_lectura'::character varying, 'administrador'::character varying, 'personalizado'::character varying, 'inactivo'::character varying])::text[])))
);


ALTER TABLE public.empleados OWNER TO postgres;

--
-- Name: TABLE empleados; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.empleados IS 'InformaciÃ³n completa de empleados de la empresa';


--
-- Name: empleados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empleados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.empleados_id_seq OWNER TO postgres;

--
-- Name: empleados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empleados_id_seq OWNED BY public.empleados.id;


--
-- Name: empleados_modulos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empleados_modulos (
    id integer NOT NULL,
    empleado_id integer NOT NULL,
    modulo character varying(100) NOT NULL,
    acceso boolean DEFAULT false,
    fecha_asignacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.empleados_modulos OWNER TO postgres;

--
-- Name: TABLE empleados_modulos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.empleados_modulos IS 'Permisos granulares por mÃ³dulo para cada empleado';


--
-- Name: empleados_modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empleados_modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.empleados_modulos_id_seq OWNER TO postgres;

--
-- Name: empleados_modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empleados_modulos_id_seq OWNED BY public.empleados_modulos.id;


--
-- Name: estados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estados (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.estados OWNER TO postgres;

--
-- Name: estados_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.estados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.estados_id_seq OWNER TO postgres;

--
-- Name: estados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.estados_id_seq OWNED BY public.estados.id;


--
-- Name: formas_pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formas_pago (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(200) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.formas_pago OWNER TO postgres;

--
-- Name: formas_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formas_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.formas_pago_id_seq OWNER TO postgres;

--
-- Name: formas_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formas_pago_id_seq OWNED BY public.formas_pago.id;


--
-- Name: metodos_pago; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metodos_pago (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(200) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.metodos_pago OWNER TO postgres;

--
-- Name: metodos_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metodos_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.metodos_pago_id_seq OWNER TO postgres;

--
-- Name: metodos_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metodos_pago_id_seq OWNED BY public.metodos_pago.id;


--
-- Name: modulos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.modulos OWNER TO postgres;

--
-- Name: modulos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modulos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.modulos_id_seq OWNER TO postgres;

--
-- Name: modulos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modulos_id_seq OWNED BY public.modulos.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre character varying(500) NOT NULL,
    rfc character varying(13),
    email character varying(255),
    telefono character varying(20),
    direccion text,
    codigo_postal character varying(10),
    ciudad character varying(255),
    estado character varying(255),
    contacto character varying(255),
    tipo_proveedor character varying(100),
    condiciones_pago character varying(255),
    notas text,
    activo boolean DEFAULT true,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_proveedores_email CHECK (((email IS NULL) OR ((email)::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT chk_proveedores_rfc CHECK (((rfc IS NULL) OR (length((rfc)::text) = ANY (ARRAY[12, 13]))))
);


ALTER TABLE public.proveedores OWNER TO postgres;

--
-- Name: TABLE proveedores; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.proveedores IS 'CatÃ¡logo de proveedores y sus datos de contacto';


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.proveedores_id_seq OWNER TO postgres;

--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: puestos; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.puestos OWNER TO postgres;

--
-- Name: TABLE puestos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.puestos IS 'CatÃ¡logo de puestos de trabajo';


--
-- Name: puestos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.puestos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.puestos_id_seq OWNER TO postgres;

--
-- Name: puestos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.puestos_id_seq OWNED BY public.puestos.id;


--
-- Name: regimenes_fiscales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regimenes_fiscales (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(500) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.regimenes_fiscales OWNER TO postgres;

--
-- Name: regimenes_fiscales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.regimenes_fiscales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.regimenes_fiscales_id_seq OWNER TO postgres;

--
-- Name: regimenes_fiscales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.regimenes_fiscales_id_seq OWNED BY public.regimenes_fiscales.id;


--
-- Name: sucursales; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.sucursales OWNER TO postgres;

--
-- Name: TABLE sucursales; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sucursales IS 'Sucursales de la empresa';


--
-- Name: sucursales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sucursales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sucursales_id_seq OWNER TO postgres;

--
-- Name: sucursales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sucursales_id_seq OWNED BY public.sucursales.id;


--
-- Name: usos_cfdi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usos_cfdi (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion character varying(500) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usos_cfdi OWNER TO postgres;

--
-- Name: usos_cfdi_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usos_cfdi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.usos_cfdi_id_seq OWNER TO postgres;

--
-- Name: usos_cfdi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usos_cfdi_id_seq OWNED BY public.usos_cfdi.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
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
    CONSTRAINT chk_usuarios_role CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'gerente'::character varying, 'empleado'::character varying, 'invitado'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema con autenticaciÃ³n y autorizaciÃ³n';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vista_clientes_activos; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.vista_clientes_activos OWNER TO postgres;

--
-- Name: vista_empleados_completa; Type: VIEW; Schema: public; Owner: postgres
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


ALTER TABLE public.vista_empleados_completa OWNER TO postgres;

--
-- Name: auditoria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria ALTER COLUMN id SET DEFAULT nextval('public.auditoria_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: empleados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados ALTER COLUMN id SET DEFAULT nextval('public.empleados_id_seq'::regclass);


--
-- Name: empleados_modulos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados_modulos ALTER COLUMN id SET DEFAULT nextval('public.empleados_modulos_id_seq'::regclass);


--
-- Name: estados id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estados ALTER COLUMN id SET DEFAULT nextval('public.estados_id_seq'::regclass);


--
-- Name: formas_pago id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formas_pago ALTER COLUMN id SET DEFAULT nextval('public.formas_pago_id_seq'::regclass);


--
-- Name: metodos_pago id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago ALTER COLUMN id SET DEFAULT nextval('public.metodos_pago_id_seq'::regclass);


--
-- Name: modulos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos ALTER COLUMN id SET DEFAULT nextval('public.modulos_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: puestos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puestos ALTER COLUMN id SET DEFAULT nextval('public.puestos_id_seq'::regclass);


--
-- Name: regimenes_fiscales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regimenes_fiscales ALTER COLUMN id SET DEFAULT nextval('public.regimenes_fiscales_id_seq'::regclass);


--
-- Name: sucursales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursales ALTER COLUMN id SET DEFAULT nextval('public.sucursales_id_seq'::regclass);


--
-- Name: usos_cfdi id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usos_cfdi ALTER COLUMN id SET DEFAULT nextval('public.usos_cfdi_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: auditoria; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.clientes VALUES (2, 'CLE920615B84', 'Colegio León XIII A.C.', 'Colegio León XIII', 'ventas@papeleriamundial.com', '961-200-0002', NULL, NULL, NULL, '29020', NULL, NULL, '603', 'G01', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Blvd. Belisario Domínguez, 789, Jardines de Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (3, 'OCH010228C93', 'Oficinas Chiapas, S.A. de C.V.', 'Oficinas Chiapas', 'info@oficinaschiapas.com', '961-200-0003', NULL, NULL, NULL, '29000', NULL, NULL, '601', 'G03', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', '3ra. Avenida Norte Oriente, 1515, Centro, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (4, 'SII150810D45', 'Servicios de Impresión del Istmo S.A.', 'Copiasistmo', 'gerencia@copiasistmo.com', '961-200-0004', NULL, NULL, NULL, '29000', NULL, NULL, '601', 'G03', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Calle Primera Norte, 654, Centro, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (5, 'CSP180920E56', 'Consultoría y Servicios Profesionales Maya S.C.', 'Consultores Maya', 'contacto@consultoresmaya.com', '961-200-0005', NULL, NULL, NULL, '29050', NULL, NULL, '612', 'G01', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Av. Universidad, 321, Universitaria, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (6, 'GAD190531F67', 'González y Asociados Despacho Jurídico S.C.', 'Despacho Jurídico González', 'info@gonzalezabogados.com', '961-200-0006', NULL, NULL, NULL, '29000', NULL, NULL, '612', 'G01', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Calle Primera Norte, 789, Centro, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (7, 'DCH170215G78', 'Distribuidora de Chiapas S.A. de C.V.', 'Distribuidora Chiapas', 'ventas@districhiapas.com', '961-200-0007', NULL, NULL, NULL, '29020', NULL, NULL, '601', 'G03', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Blvd. Los Castillos, 456, Las Flores, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (8, 'CSM140815H89', 'Constructora del Sur de México S.A. de C.V.', 'Constructora del Sur', 'proyectos@constructoradelsur.com', '961-200-0008', NULL, NULL, NULL, '29010', NULL, NULL, '601', 'G03', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Libramiento Norte Poniente, 2500, Plan de Ayala, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (9, 'ICP111020I90', 'Instituto de Capacitación Profesional del Sureste A.C.', 'ICP Sureste', 'informes@icpsureste.edu.mx', '961-200-0009', NULL, NULL, NULL, '29000', NULL, NULL, '603', 'D10', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Calle Central Oriente, 1200, Centro, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (10, 'OAL160305J01', 'Operadora de Alimentos La Casona S.A. de C.V.', 'Restaurante La Casona', 'reservas@lacasonatgz.com', '961-200-0010', NULL, NULL, NULL, '29000', NULL, NULL, '601', 'G03', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Av. Central Poniente, 850, Centro, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (12, 'HST120915L23', 'Hotelera y Servicios Turísticos del Grijalva S.A.', 'Hotel Ejecutivo Plaza', 'reservaciones@hotelegecutivotgz.com', '961-200-0012', NULL, NULL, NULL, '29030', NULL, NULL, '601', 'G01', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Blvd. Belisario Domínguez, 1450, Moctezuma, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (13, 'CPA191105M34', 'Creativos y Publicistas Asociados S.A. de C.V.', 'Agencia Creativa TGZ', 'contacto@creativostgz.com', '961-200-0013', NULL, NULL, NULL, '29000', NULL, NULL, '601', 'G03', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 01:38:22.089808-06', 'Calle 2da. Poniente Sur, 234, Centro, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (1, 'SUR850315A72', 'del Sureste S.A. de C.V.', 'Papelería Mundial', 'contacto@serviciosses.com', '961-200-0001', NULL, NULL, NULL, '29020', NULL, NULL, '601', 'G03', true, '2025-10-15 01:38:22.089808-06', '2025-10-15 23:01:12.836429-06', 'reforma 222', '65674663883');
INSERT INTO public.clientes VALUES (22, 'PEGJ850315ABC', 'Juan Pérez García', 'Juan Pérez García', 'juan.perez@email.com', '9611234567', NULL, NULL, NULL, '29000', NULL, NULL, '612', 'G03', true, '2025-10-15 23:26:43.721052-06', '2025-10-15 23:26:43.721052-06', 'Av. Central 123, Col. Centro, Tuxtla Gutiérrez, Chiapas', '9611234568');
INSERT INTO public.clientes VALUES (23, 'CLS920810XYZ', 'Comercializadora López S.A. de C.V.', 'Comercializadora López S.A. de C.V.', NULL, '9612345678', NULL, NULL, NULL, '29030', NULL, NULL, '601', 'G01', true, '2025-10-15 23:26:43.726086-06', '2025-10-15 23:26:43.726086-06', 'Blvd. Belisario Domínguez 456, Col. Moctezuma, Tuxtla Gutiérrez, Chiapas', NULL);
INSERT INTO public.clientes VALUES (24, 'GOHM750425DEF', 'María González Hernández', 'María González Hernández', 'maria.gonzalez@email.com', '9673456789', NULL, NULL, NULL, '29200', NULL, NULL, '612', 'G03', true, '2025-10-15 23:26:43.727255-06', '2025-10-15 23:26:43.727255-06', 'Real de Guadalupe 789, Centro, San Cristóbal de las Casas, Chiapas', '9673456790');


--
-- Data for Name: empleados; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.empleados VALUES (1, 'Administrador Sistema', 'admin@supercopias.com', '555-1000', 1, 1, 30000.00, '2024-01-01', true, NULL, '2025-10-11 23:09:08.734609-06', '2025-10-11 23:09:08.734609-06', 'completo', NULL);
INSERT INTO public.empleados VALUES (24, 'jhonatan', 'dfsd@gmail.com', '234823423', 7, 1, 5656.00, '2025-10-16', true, NULL, '2025-10-16 00:44:55.672798-06', '2025-10-16 00:44:55.740268-06', 'limitado', 19);


--
-- Data for Name: empleados_modulos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.empleados_modulos VALUES (1, 1, 'empleados', true, '2025-10-11 23:09:08.739992-06');
INSERT INTO public.empleados_modulos VALUES (2, 1, 'clientes', true, '2025-10-11 23:09:08.739992-06');
INSERT INTO public.empleados_modulos VALUES (3, 1, 'proveedores', true, '2025-10-11 23:09:08.739992-06');
INSERT INTO public.empleados_modulos VALUES (4, 1, 'reportes', true, '2025-10-11 23:09:08.739992-06');
INSERT INTO public.empleados_modulos VALUES (5, 1, 'configuracion', true, '2025-10-11 23:09:08.739992-06');
INSERT INTO public.empleados_modulos VALUES (6, 1, 'administracion', true, '2025-10-11 23:09:08.739992-06');
INSERT INTO public.empleados_modulos VALUES (173, 24, 'dashboard', true, '2025-10-16 00:44:55.677187-06');
INSERT INTO public.empleados_modulos VALUES (174, 24, 'empleados', true, '2025-10-16 00:44:55.678129-06');


--
-- Data for Name: estados; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.estados VALUES (1, 'AGU', 'Aguascalientes', true, '2025-10-11 23:12:28.251575-06');
INSERT INTO public.estados VALUES (2, 'BCN', 'Baja California', true, '2025-10-11 23:12:28.25423-06');
INSERT INTO public.estados VALUES (3, 'BCS', 'Baja California Sur', true, '2025-10-11 23:12:28.254726-06');
INSERT INTO public.estados VALUES (4, 'CAM', 'Campeche', true, '2025-10-11 23:12:28.25509-06');
INSERT INTO public.estados VALUES (5, 'CHP', 'Chiapas', true, '2025-10-11 23:12:28.255518-06');
INSERT INTO public.estados VALUES (6, 'CHH', 'Chihuahua', true, '2025-10-11 23:12:28.255906-06');
INSERT INTO public.estados VALUES (7, 'CMX', 'Ciudad de México', true, '2025-10-11 23:12:28.256365-06');
INSERT INTO public.estados VALUES (8, 'COA', 'Coahuila', true, '2025-10-11 23:12:28.256719-06');
INSERT INTO public.estados VALUES (9, 'COL', 'Colima', true, '2025-10-11 23:12:28.257117-06');
INSERT INTO public.estados VALUES (10, 'DUR', 'Durango', true, '2025-10-11 23:12:28.257457-06');
INSERT INTO public.estados VALUES (11, 'MEX', 'Estado de México', true, '2025-10-11 23:12:28.25775-06');
INSERT INTO public.estados VALUES (12, 'GUA', 'Guanajuato', true, '2025-10-11 23:12:28.258022-06');
INSERT INTO public.estados VALUES (13, 'GRO', 'Guerrero', true, '2025-10-11 23:12:28.258374-06');
INSERT INTO public.estados VALUES (14, 'HID', 'Hidalgo', true, '2025-10-11 23:12:28.258653-06');
INSERT INTO public.estados VALUES (15, 'JAL', 'Jalisco', true, '2025-10-11 23:12:28.258915-06');
INSERT INTO public.estados VALUES (16, 'MIC', 'Michoacán', true, '2025-10-11 23:12:28.259192-06');
INSERT INTO public.estados VALUES (17, 'MOR', 'Morelos', true, '2025-10-11 23:12:28.259478-06');
INSERT INTO public.estados VALUES (18, 'NAY', 'Nayarit', true, '2025-10-11 23:12:28.259742-06');
INSERT INTO public.estados VALUES (19, 'NLE', 'Nuevo León', true, '2025-10-11 23:12:28.260003-06');
INSERT INTO public.estados VALUES (20, 'OAX', 'Oaxaca', true, '2025-10-11 23:12:28.260275-06');
INSERT INTO public.estados VALUES (21, 'PUE', 'Puebla', true, '2025-10-11 23:12:28.260537-06');
INSERT INTO public.estados VALUES (22, 'QUE', 'Querétaro', true, '2025-10-11 23:12:28.260835-06');
INSERT INTO public.estados VALUES (23, 'ROO', 'Quintana Roo', true, '2025-10-11 23:12:28.261167-06');
INSERT INTO public.estados VALUES (24, 'SLP', 'San Luis Potosí', true, '2025-10-11 23:12:28.261488-06');
INSERT INTO public.estados VALUES (25, 'SIN', 'Sinaloa', true, '2025-10-11 23:12:28.261811-06');
INSERT INTO public.estados VALUES (26, 'SON', 'Sonora', true, '2025-10-11 23:12:28.262132-06');
INSERT INTO public.estados VALUES (27, 'TAB', 'Tabasco', true, '2025-10-11 23:12:28.26244-06');
INSERT INTO public.estados VALUES (28, 'TAM', 'Tamaulipas', true, '2025-10-11 23:12:28.262714-06');
INSERT INTO public.estados VALUES (29, 'TLA', 'Tlaxcala', true, '2025-10-11 23:12:28.262975-06');
INSERT INTO public.estados VALUES (30, 'VER', 'Veracruz', true, '2025-10-11 23:12:28.263237-06');
INSERT INTO public.estados VALUES (31, 'YUC', 'Yucatán', true, '2025-10-11 23:12:28.263502-06');
INSERT INTO public.estados VALUES (32, 'ZAC', 'Zacatecas', true, '2025-10-11 23:12:28.263967-06');


--
-- Data for Name: formas_pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.formas_pago VALUES (1, '01', 'Efectivo', true, '2025-10-11 23:12:28.279051-06');
INSERT INTO public.formas_pago VALUES (2, '02', 'Cheque nominativo', true, '2025-10-11 23:12:28.280649-06');
INSERT INTO public.formas_pago VALUES (3, '03', 'Transferencia electrónica de fondos', true, '2025-10-11 23:12:28.280916-06');
INSERT INTO public.formas_pago VALUES (4, '04', 'Tarjeta de crédito', true, '2025-10-11 23:12:28.281169-06');
INSERT INTO public.formas_pago VALUES (5, '05', 'Monedero electrónico', true, '2025-10-11 23:12:28.281417-06');
INSERT INTO public.formas_pago VALUES (6, '06', 'Dinero electrónico', true, '2025-10-11 23:12:28.281718-06');
INSERT INTO public.formas_pago VALUES (7, '08', 'Vales de despensa', true, '2025-10-11 23:12:28.282009-06');
INSERT INTO public.formas_pago VALUES (8, '12', 'Dación en pago', true, '2025-10-11 23:12:28.282325-06');
INSERT INTO public.formas_pago VALUES (9, '13', 'Pago por subrogación', true, '2025-10-11 23:12:28.282589-06');
INSERT INTO public.formas_pago VALUES (10, '14', 'Pago por consignación', true, '2025-10-11 23:12:28.282894-06');
INSERT INTO public.formas_pago VALUES (11, '15', 'Condonación', true, '2025-10-11 23:12:28.283165-06');
INSERT INTO public.formas_pago VALUES (12, '17', 'Compensación', true, '2025-10-11 23:12:28.283415-06');
INSERT INTO public.formas_pago VALUES (13, '23', 'Novación', true, '2025-10-11 23:12:28.283663-06');
INSERT INTO public.formas_pago VALUES (14, '24', 'Confusión', true, '2025-10-11 23:12:28.283985-06');
INSERT INTO public.formas_pago VALUES (15, '25', 'Remisión de deuda', true, '2025-10-11 23:12:28.284295-06');
INSERT INTO public.formas_pago VALUES (16, '26', 'Prescripción o caducidad', true, '2025-10-11 23:12:28.284574-06');
INSERT INTO public.formas_pago VALUES (17, '27', 'A satisfacción del acreedor', true, '2025-10-11 23:12:28.284831-06');
INSERT INTO public.formas_pago VALUES (18, '28', 'Tarjeta de débito', true, '2025-10-11 23:12:28.28508-06');
INSERT INTO public.formas_pago VALUES (19, '29', 'Tarjeta de servicios', true, '2025-10-11 23:12:28.285327-06');
INSERT INTO public.formas_pago VALUES (20, '30', 'Aplicación de anticipos', true, '2025-10-11 23:12:28.285579-06');
INSERT INTO public.formas_pago VALUES (21, '31', 'Intermediario pagos', true, '2025-10-11 23:12:28.285824-06');
INSERT INTO public.formas_pago VALUES (22, '99', 'Por definir', true, '2025-10-11 23:12:28.286069-06');


--
-- Data for Name: metodos_pago; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.metodos_pago VALUES (1, 'PUE', 'Pago en una sola exhibición', true, '2025-10-11 23:12:28.286448-06');
INSERT INTO public.metodos_pago VALUES (2, 'PPD', 'Pago en parcialidades o diferido', true, '2025-10-11 23:12:28.287972-06');


--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.modulos VALUES (1, 'dashboard', 'Dashboard', 'fas fa-tachometer-alt', true, 0, '2025-10-11 23:12:28.28835-06');
INSERT INTO public.modulos VALUES (2, 'empleados', 'Empleados', 'fas fa-users', true, 0, '2025-10-11 23:12:28.290377-06');
INSERT INTO public.modulos VALUES (3, 'clientes', 'Clientes', 'fas fa-user-friends', true, 0, '2025-10-11 23:12:28.290694-06');
INSERT INTO public.modulos VALUES (4, 'proveedores', 'Proveedores', 'fas fa-truck', true, 0, '2025-10-11 23:12:28.29097-06');
INSERT INTO public.modulos VALUES (5, 'inventarios', 'Inventarios', 'fas fa-boxes', true, 0, '2025-10-11 23:12:28.291232-06');
INSERT INTO public.modulos VALUES (6, 'equipos', 'Equipos', 'fas fa-tools', true, 0, '2025-10-11 23:12:28.291492-06');
INSERT INTO public.modulos VALUES (7, 'reportes', 'Reportes', 'fas fa-chart-bar', true, 0, '2025-10-11 23:12:28.29175-06');
INSERT INTO public.modulos VALUES (8, 'punto_venta', 'Punto de Venta', 'fas fa-cash-register', true, 0, '2025-10-11 23:12:28.292027-06');
INSERT INTO public.modulos VALUES (9, 'configuracion', 'Configuración', 'fas fa-cogs', false, 0, '2025-10-11 23:12:28.292289-06');


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.proveedores VALUES (1, 'Papelería El Estudiante', 'PES910315ABC', 'ventas@estudiantepapeleria.com', '555-1001', 'Av. Universidad 123, Col. Centro', '06000', 'Ciudad de México', 'CDMX', 'María González', 'Suministros', '30 días', 'Proveedor principal de papelería y suministros de oficina', true, '2023-01-09 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (2, 'Tecnología y Sistemas SA', 'TYS850420DEF', 'soporte@tecnologiasistemas.com', '555-1002', 'Calle Tecnología 456, Col. Moderna', '03100', 'Ciudad de México', 'CDMX', 'Ing. Carlos Ramírez', 'Tecnología', '15 días', 'Mantenimiento de equipos de cómputo y redes', true, '2023-02-04 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (3, 'Servicios de Limpieza Integral', 'SLI780630GHI', 'admin@limpiezaintegral.com', '555-1003', 'Av. Servicios 789, Col. Industrial', '07300', 'Ciudad de México', 'CDMX', 'Sra. Patricia Herrera', 'Servicios', 'Contado', 'Servicio de limpieza diario para oficinas', true, '2023-03-11 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (4, 'Insumos y Toners Express', 'ITE920815JKL', 'pedidos@tonersexpress.com', '555-1004', 'Blvd. Insumos 321, Col. Comercial', '06500', 'Ciudad de México', 'CDMX', 'Lic. Roberto Silva', 'Productos', '45 días', 'Cartuchos, toners y consumibles para impresoras', true, '2023-04-17 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (5, 'Capacitación Empresarial Pro', 'CEP870925MNO', 'cursos@capacitacionpro.com', '555-1005', 'Av. Capacitación 654, Col. Educativa', '03900', 'Ciudad de México', 'CDMX', 'Mtra. Ana López', 'Capacitación', 'Anticipado', 'Cursos de desarrollo profesional y técnico', true, '2023-05-21 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (6, 'Papelería El Estudiante', 'PES910315ABC', 'ventas@estudiantepapeleria.com', '555-1001', 'Av. Universidad 123, Col. Centro', '06000', 'Ciudad de México', 'CDMX', 'María González', 'Suministros', '30 días', 'Proveedor principal de papelería y suministros de oficina', true, '2023-01-09 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (7, 'Tecnología y Sistemas SA', 'TYS850420DEF', 'soporte@tecnologiasistemas.com', '555-1002', 'Calle Tecnología 456, Col. Moderna', '03100', 'Ciudad de México', 'CDMX', 'Ing. Carlos Ramírez', 'Tecnología', '15 días', 'Mantenimiento de equipos de cómputo y redes', true, '2023-02-04 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (8, 'Servicios de Limpieza Integral', 'SLI780630GHI', 'admin@limpiezaintegral.com', '555-1003', 'Av. Servicios 789, Col. Industrial', '07300', 'Ciudad de México', 'CDMX', 'Sra. Patricia Herrera', 'Servicios', 'Contado', 'Servicio de limpieza diario para oficinas', true, '2023-03-11 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (9, 'Insumos y Toners Express', 'ITE920815JKL', 'pedidos@tonersexpress.com', '555-1004', 'Blvd. Insumos 321, Col. Comercial', '06500', 'Ciudad de México', 'CDMX', 'Lic. Roberto Silva', 'Productos', '45 días', 'Cartuchos, toners y consumibles para impresoras', true, '2023-04-17 18:00:00-06', NULL);
INSERT INTO public.proveedores VALUES (10, 'Capacitación Empresarial Pro', 'CEP870925MNO', 'cursos@capacitacionpro.com', '555-1005', 'Av. Capacitación 654, Col. Educativa', '03900', 'Ciudad de México', 'CDMX', 'Mtra. Ana López', 'Capacitación', 'Anticipado', 'Cursos de desarrollo profesional y técnico', true, '2023-05-21 18:00:00-06', NULL);


--
-- Data for Name: puestos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.puestos VALUES (1, 'Gerente General', 'Responsable de la operaciÃ³n general', 25000.00, 35000.00, true, '2025-10-11 23:09:08.733062-06', '2025-10-11 23:09:08.733062-06');
INSERT INTO public.puestos VALUES (3, 'Supervisor', 'SupervisiÃ³n de operaciones diarias', 12000.00, 18000.00, true, '2025-10-11 23:09:08.733062-06', '2025-10-11 23:09:08.733062-06');
INSERT INTO public.puestos VALUES (4, 'Empleado de Mostrador', 'AtenciÃ³n directa al cliente', 8000.00, 12000.00, true, '2025-10-11 23:09:08.733062-06', '2025-10-11 23:09:08.733062-06');
INSERT INTO public.puestos VALUES (5, 'Cajero', 'Manejo de caja y cobros', 8000.00, 10000.00, true, '2025-10-11 23:09:08.733062-06', '2025-10-11 23:09:08.733062-06');
INSERT INTO public.puestos VALUES (2, 'Gerente de Sucursal', 'Responsable de la administración general de la sucursal', 20000.00, 35000.00, true, '2025-10-11 23:09:08.733062-06', '2025-10-11 23:18:16.918139-06');
INSERT INTO public.puestos VALUES (7, 'Asistente de Ventas', 'Apoyo en atención al cliente y ventas', 12000.00, 18000.00, true, '2025-10-11 10:10:57.691-06', '2025-10-11 23:18:16.919149-06');
INSERT INTO public.puestos VALUES (8, 'Auxiliar Administrativo', 'Apoyo en tareas administrativas y de oficina', 10000.00, 15000.00, true, '2025-10-11 10:10:57.691-06', '2025-10-11 23:18:16.919863-06');
INSERT INTO public.puestos VALUES (9, 'Operador de Equipos', 'Manejo y mantenimiento de equipos de copiado e impresión', 11000.00, 16000.00, true, '2025-10-11 10:10:57.691-06', '2025-10-11 23:18:16.92042-06');


--
-- Data for Name: regimenes_fiscales; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.regimenes_fiscales VALUES (1, '601', 'General de Ley Personas Morales', true, '2025-10-11 23:12:28.2644-06');
INSERT INTO public.regimenes_fiscales VALUES (2, '603', 'Personas Morales con Fines no Lucrativos', true, '2025-10-11 23:12:28.266054-06');
INSERT INTO public.regimenes_fiscales VALUES (3, '605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', true, '2025-10-11 23:12:28.266326-06');
INSERT INTO public.regimenes_fiscales VALUES (4, '606', 'Arrendamiento', true, '2025-10-11 23:12:28.266582-06');
INSERT INTO public.regimenes_fiscales VALUES (5, '607', 'Régimen de Enajenación o Adquisición de Bienes', true, '2025-10-11 23:12:28.266836-06');
INSERT INTO public.regimenes_fiscales VALUES (6, '608', 'Demás ingresos', true, '2025-10-11 23:12:28.267085-06');
INSERT INTO public.regimenes_fiscales VALUES (7, '610', 'Residentes en el Extranjero sin Establecimiento Permanente en México', true, '2025-10-11 23:12:28.267334-06');
INSERT INTO public.regimenes_fiscales VALUES (8, '611', 'Ingresos por Dividendos (socios y accionistas)', true, '2025-10-11 23:12:28.267579-06');
INSERT INTO public.regimenes_fiscales VALUES (9, '612', 'Personas Físicas con Actividades Empresariales y Profesionales', true, '2025-10-11 23:12:28.267843-06');
INSERT INTO public.regimenes_fiscales VALUES (10, '614', 'Ingresos por intereses', true, '2025-10-11 23:12:28.268118-06');
INSERT INTO public.regimenes_fiscales VALUES (11, '615', 'Régimen de los ingresos por obtención de premios', true, '2025-10-11 23:12:28.268415-06');
INSERT INTO public.regimenes_fiscales VALUES (12, '616', 'Sin obligaciones fiscales', true, '2025-10-11 23:12:28.26881-06');
INSERT INTO public.regimenes_fiscales VALUES (13, '620', 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', true, '2025-10-11 23:12:28.269139-06');
INSERT INTO public.regimenes_fiscales VALUES (14, '621', 'Incorporación Fiscal', true, '2025-10-11 23:12:28.269467-06');
INSERT INTO public.regimenes_fiscales VALUES (15, '622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', true, '2025-10-11 23:12:28.269747-06');
INSERT INTO public.regimenes_fiscales VALUES (16, '623', 'Opcional para Grupos de Sociedades', true, '2025-10-11 23:12:28.270012-06');
INSERT INTO public.regimenes_fiscales VALUES (17, '624', 'Coordinados', true, '2025-10-11 23:12:28.270265-06');
INSERT INTO public.regimenes_fiscales VALUES (18, '625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', true, '2025-10-11 23:12:28.270519-06');
INSERT INTO public.regimenes_fiscales VALUES (19, '626', 'Régimen Simplificado de Confianza', true, '2025-10-11 23:12:28.270769-06');


--
-- Data for Name: sucursales; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.sucursales VALUES (1, 'Sucursal Centro', 'Centro de Tuxtla Gutiérrez', '961-100-1001', 'María Gómez Hernández', true, '2025-10-11 23:09:08.731227-06', '2025-10-11 23:18:16.914451-06');
INSERT INTO public.sucursales VALUES (2, 'Sucursal Norte', 'Norte de Tuxtla Gutiérrez', '961-100-1002', 'Juan Pérez Martínez', true, '2025-10-11 23:09:08.731227-06', '2025-10-11 23:18:16.917174-06');
INSERT INTO public.sucursales VALUES (3, 'Sucursal Sur', 'Sur de Tuxtla Gutiérrez', '961-100-1003', 'Ana López Silva', true, '2025-10-11 23:09:08.731227-06', '2025-10-11 23:18:16.917594-06');


--
-- Data for Name: usos_cfdi; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.usos_cfdi VALUES (1, 'G01', 'Adquisición de mercancías', true, '2025-10-11 23:12:28.271148-06');
INSERT INTO public.usos_cfdi VALUES (2, 'G02', 'Devoluciones, descuentos o bonificaciones', true, '2025-10-11 23:12:28.272833-06');
INSERT INTO public.usos_cfdi VALUES (3, 'G03', 'Gastos en general', true, '2025-10-11 23:12:28.273095-06');
INSERT INTO public.usos_cfdi VALUES (4, 'I01', 'Construcciones', true, '2025-10-11 23:12:28.273353-06');
INSERT INTO public.usos_cfdi VALUES (5, 'I02', 'Mobiliario y equipo de oficina por inversiones', true, '2025-10-11 23:12:28.273602-06');
INSERT INTO public.usos_cfdi VALUES (6, 'I03', 'Equipo de transporte', true, '2025-10-11 23:12:28.273847-06');
INSERT INTO public.usos_cfdi VALUES (7, 'I04', 'Equipo de cómputo y accesorios', true, '2025-10-11 23:12:28.274093-06');
INSERT INTO public.usos_cfdi VALUES (8, 'I05', 'Dados, troqueles, moldes, matrices y herramental', true, '2025-10-11 23:12:28.274337-06');
INSERT INTO public.usos_cfdi VALUES (9, 'I06', 'Comunicaciones telefónicas', true, '2025-10-11 23:12:28.274586-06');
INSERT INTO public.usos_cfdi VALUES (10, 'I07', 'Comunicaciones satelitales', true, '2025-10-11 23:12:28.27487-06');
INSERT INTO public.usos_cfdi VALUES (11, 'I08', 'Otra maquinaria y equipo', true, '2025-10-11 23:12:28.275168-06');
INSERT INTO public.usos_cfdi VALUES (12, 'D01', 'Honorarios médicos, dentales y gastos hospitalarios', true, '2025-10-11 23:12:28.275478-06');
INSERT INTO public.usos_cfdi VALUES (13, 'D02', 'Gastos médicos por incapacidad o discapacidad', true, '2025-10-11 23:12:28.275744-06');
INSERT INTO public.usos_cfdi VALUES (14, 'D03', 'Gastos funerales', true, '2025-10-11 23:12:28.276009-06');
INSERT INTO public.usos_cfdi VALUES (15, 'D04', 'Donativos', true, '2025-10-11 23:12:28.276286-06');
INSERT INTO public.usos_cfdi VALUES (16, 'D05', 'Intereses reales efectivamente pagados por créditos hipotecarios', true, '2025-10-11 23:12:28.276545-06');
INSERT INTO public.usos_cfdi VALUES (17, 'D06', 'Aportaciones voluntarias al SAR', true, '2025-10-11 23:12:28.276799-06');
INSERT INTO public.usos_cfdi VALUES (18, 'D07', 'Primas por seguros de gastos médicos', true, '2025-10-11 23:12:28.277045-06');
INSERT INTO public.usos_cfdi VALUES (19, 'D08', 'Gastos de transportación escolar obligatoria', true, '2025-10-11 23:12:28.277292-06');
INSERT INTO public.usos_cfdi VALUES (20, 'D09', 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones', true, '2025-10-11 23:12:28.27754-06');
INSERT INTO public.usos_cfdi VALUES (21, 'D10', 'Pagos por servicios educativos (colegiaturas)', true, '2025-10-11 23:12:28.277791-06');
INSERT INTO public.usos_cfdi VALUES (22, 'S01', 'Sin efectos fiscales', true, '2025-10-11 23:12:28.278038-06');
INSERT INTO public.usos_cfdi VALUES (23, 'CP01', 'Pagos', true, '2025-10-11 23:12:28.278364-06');
INSERT INTO public.usos_cfdi VALUES (24, 'CN01', 'Nómina', true, '2025-10-11 23:12:28.278617-06');


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.usuarios VALUES (1, 'admin', '$2a$10$T1AaTiFCWAt.ubexs.QkreJSTQRKRjPy2VeyQXCslX82feThi9tuW', 'Administrador SuperCopias', 'admin@supercopias.com', 'admin', '["admin"]', NULL, true, '2025-10-11 23:09:08.738514-06', '2025-10-16 01:28:05.615298-06', '2025-10-16 01:28:05.615298-06', 'Administrador SuperCopias', '+52 961 100 0000', 'Administrador principal del sistema SuperCopias', '');
INSERT INTO public.usuarios VALUES (19, '001.Jhonatan', '$2a$08$a5x.y3QbNF9tbBG/w6QT6u1X3fgQsI12GE4pYzshgM9uV.OFfGhBy', 'jhonatan', 'dfsd@gmail.com', 'empleado', '["empleado"]', 24, true, '2025-10-16 00:44:55.739087-06', '2025-10-16 01:28:36.43517-06', '2025-10-16 01:28:36.43517-06', 'jhonatan', '234823423', 'Empleado - Acceso personalizado', NULL);


--
-- Name: auditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditoria_id_seq', 176, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clientes_id_seq', 26, true);


--
-- Name: empleados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empleados_id_seq', 24, true);


--
-- Name: empleados_modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empleados_modulos_id_seq', 174, true);


--
-- Name: estados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estados_id_seq', 64, true);


--
-- Name: formas_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formas_pago_id_seq', 44, true);


--
-- Name: metodos_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metodos_pago_id_seq', 4, true);


--
-- Name: modulos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modulos_id_seq', 18, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 10, true);


--
-- Name: puestos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.puestos_id_seq', 9, true);


--
-- Name: regimenes_fiscales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regimenes_fiscales_id_seq', 38, true);


--
-- Name: sucursales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sucursales_id_seq', 6, true);


--
-- Name: usos_cfdi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usos_cfdi_id_seq', 48, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 19, true);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_email_key UNIQUE (email);


--
-- Name: empleados_modulos empleados_modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados_modulos
    ADD CONSTRAINT empleados_modulos_pkey PRIMARY KEY (id);


--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (id);


--
-- Name: estados estados_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_codigo_key UNIQUE (codigo);


--
-- Name: estados estados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_pkey PRIMARY KEY (id);


--
-- Name: formas_pago formas_pago_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formas_pago
    ADD CONSTRAINT formas_pago_codigo_key UNIQUE (codigo);


--
-- Name: formas_pago formas_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formas_pago
    ADD CONSTRAINT formas_pago_pkey PRIMARY KEY (id);


--
-- Name: metodos_pago metodos_pago_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_codigo_key UNIQUE (codigo);


--
-- Name: metodos_pago metodos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metodos_pago
    ADD CONSTRAINT metodos_pago_pkey PRIMARY KEY (id);


--
-- Name: modulos modulos_clave_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_clave_key UNIQUE (clave);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: puestos puestos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puestos
    ADD CONSTRAINT puestos_pkey PRIMARY KEY (id);


--
-- Name: regimenes_fiscales regimenes_fiscales_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regimenes_fiscales
    ADD CONSTRAINT regimenes_fiscales_codigo_key UNIQUE (codigo);


--
-- Name: regimenes_fiscales regimenes_fiscales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regimenes_fiscales
    ADD CONSTRAINT regimenes_fiscales_pkey PRIMARY KEY (id);


--
-- Name: sucursales sucursales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT sucursales_pkey PRIMARY KEY (id);


--
-- Name: empleados_modulos uk_empleados_modulos; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados_modulos
    ADD CONSTRAINT uk_empleados_modulos UNIQUE (empleado_id, modulo);


--
-- Name: puestos unique_puesto_nombre; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puestos
    ADD CONSTRAINT unique_puesto_nombre UNIQUE (nombre);


--
-- Name: sucursales unique_sucursal_nombre; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sucursales
    ADD CONSTRAINT unique_sucursal_nombre UNIQUE (nombre);


--
-- Name: usos_cfdi usos_cfdi_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usos_cfdi
    ADD CONSTRAINT usos_cfdi_codigo_key UNIQUE (codigo);


--
-- Name: usos_cfdi usos_cfdi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usos_cfdi
    ADD CONSTRAINT usos_cfdi_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: idx_auditoria_fecha; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_operacion);


--
-- Name: idx_auditoria_operacion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_operacion ON public.auditoria USING btree (operacion);


--
-- Name: idx_auditoria_registro_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_registro_id ON public.auditoria USING btree (registro_id);


--
-- Name: idx_auditoria_tabla; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_tabla ON public.auditoria USING btree (tabla);


--
-- Name: idx_auditoria_usuario_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_usuario_id ON public.auditoria USING btree (usuario_id);


--
-- Name: idx_clientes_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_activo ON public.clientes USING btree (activo);


--
-- Name: idx_clientes_codigo_postal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_codigo_postal ON public.clientes USING btree (direccion_codigo_postal);


--
-- Name: idx_clientes_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_email ON public.clientes USING btree (email);


--
-- Name: idx_clientes_razon_social; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_razon_social ON public.clientes USING btree (razon_social);


--
--
-- Name: idx_empleados_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_activo ON public.empleados USING btree (activo);


--
-- Name: idx_empleados_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_email ON public.empleados USING btree (email);


--
-- Name: idx_empleados_fecha_ingreso; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_fecha_ingreso ON public.empleados USING btree (fecha_ingreso);


--
-- Name: idx_empleados_modulos_acceso; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_modulos_acceso ON public.empleados_modulos USING btree (acceso);


--
-- Name: idx_empleados_modulos_empleado_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_modulos_empleado_id ON public.empleados_modulos USING btree (empleado_id);


--
-- Name: idx_empleados_modulos_modulo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_modulos_modulo ON public.empleados_modulos USING btree (modulo);


--
-- Name: idx_empleados_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_empleados_nombre ON public.empleados USING btree (nombre);


--
-- Name: idx_estados_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_estados_codigo ON public.estados USING btree (codigo);


--
-- Name: idx_formas_pago_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_formas_pago_codigo ON public.formas_pago USING btree (codigo);


--
-- Name: idx_metodos_pago_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_metodos_pago_codigo ON public.metodos_pago USING btree (codigo);


--
-- Name: idx_modulos_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_modulos_activo ON public.modulos USING btree (activo);


--
-- Name: idx_modulos_clave; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_modulos_clave ON public.modulos USING btree (clave);


--
-- Name: idx_proveedores_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_activo ON public.proveedores USING btree (activo);


--
-- Name: idx_proveedores_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_email ON public.proveedores USING btree (email);


--
-- Name: idx_proveedores_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_nombre ON public.proveedores USING btree (nombre);


--
-- Name: idx_proveedores_rfc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_rfc ON public.proveedores USING btree (rfc);


--
-- Name: idx_proveedores_tipo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proveedores_tipo ON public.proveedores USING btree (tipo_proveedor);


--
-- Name: idx_puestos_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_puestos_activo ON public.puestos USING btree (activo);


--
-- Name: idx_puestos_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_puestos_nombre ON public.puestos USING btree (nombre);


--
-- Name: idx_regimenes_fiscales_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_regimenes_fiscales_codigo ON public.regimenes_fiscales USING btree (codigo);


--
-- Name: idx_sucursales_activa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sucursales_activa ON public.sucursales USING btree (activa);


--
-- Name: idx_sucursales_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sucursales_nombre ON public.sucursales USING btree (nombre);


--
-- Name: idx_usos_cfdi_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usos_cfdi_codigo ON public.usos_cfdi USING btree (codigo);


--
-- Name: idx_usuarios_activo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_activo ON public.usuarios USING btree (activo);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_empleado_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_empleado_id ON public.usuarios USING btree (empleado_id);


--
-- Name: idx_usuarios_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_role ON public.usuarios USING btree (role);


--
-- Name: idx_usuarios_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuarios_username ON public.usuarios USING btree (username);


--
-- Name: clientes trg_clientes_auditoria; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clientes_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: clientes trg_clientes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: empleados trg_empleados_auditoria; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_empleados_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: empleados trg_empleados_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_empleados_updated_at BEFORE UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: proveedores trg_proveedores_auditoria; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_proveedores_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: proveedores trg_proveedores_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: puestos trg_puestos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_puestos_updated_at BEFORE UPDATE ON public.puestos FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: sucursales trg_sucursales_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sucursales_updated_at BEFORE UPDATE ON public.sucursales FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: usuarios trg_usuarios_auditoria; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_usuarios_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();


--
-- Name: usuarios trg_usuarios_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trigger_updated_at();


--
-- Name: empleados_modulos fk_empleados_modulos_empleado; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados_modulos
    ADD CONSTRAINT fk_empleados_modulos_empleado FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;


--
-- Name: empleados fk_empleados_puesto; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_puesto FOREIGN KEY (puesto_id) REFERENCES public.puestos(id);


--
-- Name: empleados fk_empleados_sucursal; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_sucursal FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id);


--
-- Name: usuarios fk_usuarios_empleado; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_empleado FOREIGN KEY (empleado_id) REFERENCES public.empleados(id);


--
-- PostgreSQL database dump complete
--

\unrestrict yhvszANWIBnevEW2OGfZL8wCZX2g9jBK82unZARXabtwzavtpISlGz1JIpGbhGd

