/**
 * Configuración de Base de Datos PostgreSQL - SuperCopias
 * Gestión de conexiones, pools y utilidades para PostgreSQL
 */

// Cargar variables de entorno
require('dotenv').config();

const { Pool } = require('pg');

// Configuración del pool de conexiones PostgreSQL
// Render y otras plataformas proporcionan DATABASE_URL, que tiene prioridad sobre variables individuales
const dbConfig = process.env.DATABASE_URL 
  ? {
      // Configuración para producción (usando DATABASE_URL de Render/Railway/etc)
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      idleTimeoutMillis: parseInt(process.env.DB_TIMEOUT) || 60000,
      connectionTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      application_name: 'SuperCopias_Backend'
    }
  : {
      // Configuración para desarrollo local (usando variables individuales)
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'supercopias',
      max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      idleTimeoutMillis: parseInt(process.env.DB_TIMEOUT) || 60000,
      connectionTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      ssl: false,
      application_name: 'SuperCopias_Backend'
    };


// Pool de conexiones
let pool;

/**
 * Inicializar conexión a PostgreSQL
 */
async function initializeDatabase() {
  try {
    pool = new Pool(dbConfig);
    
    // Probar conexión
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');

    // Crear tabla de auditoría de seguridad si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS pos_alertas_seguridad (
        id            SERIAL PRIMARY KEY,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tipo          VARCHAR(60)  NOT NULL,
        usuario_id    INTEGER,
        usuario_nombre VARCHAR(120),
        ip            VARCHAR(60),
        detalle       JSONB,
        descripcion   TEXT
      )
    `);

    client.release();
    
    console.log('✅ PostgreSQL conectado exitosamente');
    console.log(`📅 Tiempo servidor: ${result.rows[0].current_time}`);
    console.log(`🐘 Versión: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`);
    
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    throw error;
  }
}

/**
 * Ejecutar consulta SQL con manejo de errores
 * @param {string} text - Query SQL con placeholders $1, $2, etc.
 * @param {Array} params - Parámetros para la consulta
 * @returns {Object} Resultado de la consulta
 */
async function query(text, params = []) {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log para desarrollo (opcional)
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.log(`⚠️  Consulta lenta ejecutada (${duration}ms): ${text.substring(0, 100)}...`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error en consulta PostgreSQL:', {
      error: error.message,
      query: text.substring(0, 200),
      params: params
    });
    throw error;
  }
}

/**
 * Ejecutar una consulta SQL con contexto de usuario para los triggers de auditoría.
 * Abre un cliente dedicado, fija SET LOCAL app.current_user_id/nombre dentro de una
 * transacción explícita para que trigger_auditoria() pueda leerlos, y hace COMMIT.
 *
 * Usar en TODAS las mutaciones (INSERT/UPDATE/DELETE) sobre tablas con trigger de auditoría:
 *   clientes, empleados, proveedores, usuarios, inventarios,
 *   pos_ventas, equipos, facturas, pos_clientes_puntos
 *
 * @param {string} text      - Query SQL con placeholders $1, $2, ...
 * @param {Array}  params    - Parámetros del query
 * @param {*}      userId    - ID del usuario autenticado (req.user?.id)
 * @param {string} userName  - Nombre del usuario autenticado (req.user?.nombre)
 * @returns {Object} Resultado de la consulta
 */
async function queryAudit(text, params = [], userId = null, userName = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Sanitizar: ID numérico o cadena vacía; nombre sin comillas simples, máx 255 chars
    const safeId   = (userId != null && !isNaN(parseInt(userId)))
                     ? parseInt(userId).toString()
                     : '';
    const safeName = String(userName || '').substring(0, 255).replace(/'/g, "''");

    await client.query(`SET LOCAL app.current_user_id     = '${safeId}'`);
    await client.query(`SET LOCAL app.current_user_nombre = '${safeName}'`);

    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ejecutar múltiples consultas dentro de una transacción
 * @param {Function} callback - Función async que recibe el client
 * @returns {*} Resultado del callback
 */
async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Crear función query específica para esta transacción
    const transactionQuery = (text, params) => client.query(text, params);
    
    const result = await callback(transactionQuery);
    
    await client.query('COMMIT');
    return result;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en transacción, rollback ejecutado:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Obtener cliente de conexión para operaciones complejas
 * @returns {Object} Cliente PostgreSQL
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Cerrar pool de conexiones
 */
async function closePool() {
  if (pool) {
    await pool.end();
    console.log('🔌 Pool de conexiones PostgreSQL cerrado');
  }
}

/**
 * Verificar estado de la conexión
 */
async function healthCheck() {
  try {
    const result = await query('SELECT 1 as alive');
    return {
      status: 'healthy',
      database: 'postgresql',
      timestamp: new Date().toISOString(),
      alive: result.rows[0].alive === 1
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      database: 'postgresql',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Utilidades para migración y manejo de datos
 */
const dbUtils = {
  /**
   * Formatear fecha para PostgreSQL
   */
  formatDateForPostgreSQL(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString();
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return null;
    }
  },

  /**
   * Escapar strings para consultas seguras
   */
  escapeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "''");
  },

  /**
   * Generar ID único
   */
  generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Convertir boolean para PostgreSQL
   */
  booleanToPostgreSQL(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    if (typeof value === 'number') return value === 1;
    return false;
  },

  /**
   * Parsear JSON de manera segura
   */
  safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  },

  /**
   * Construir cláusula WHERE dinámica
   */
  buildWhereClause(filters) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  },

  /**
   * Ejecutar consulta paginada
   */
  async queryWithPagination(baseQuery, params = [], page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Consulta para contar total
    const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Consulta paginada
    const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const result = await query(paginatedQuery, [...params, limit, offset]);
    
    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      }
    };
  }
};

module.exports = {
  initializeDatabase,
  query,
  queryAudit,
  transaction,
  getClient,
  closePool,
  healthCheck,
  dbUtils,
  pool: () => pool  // Getter para acceso directo al pool si es necesario
};