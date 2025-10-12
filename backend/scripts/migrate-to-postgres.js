/**
 * Script de Migración: LowDB to PostgreSQL
 * Transfiere todos los datos del archivo db.json a la base de datos PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const { query, transaction, initializeDatabase, dbUtils } = require('../config/database');

class MigrationManager {
  constructor() {
    this.jsonDbPath = path.join(__dirname, '../db.json');
    this.logMessages = [];
    this.idMapping = {
      usuarios: {},
      empleados: {},
      clientes: {},
      proveedores: {},
      sucursales: {},
      puestos: {}
    };
    this.idCounters = {
      usuarios: 1,
      empleados: 1,
      clientes: 1,
      proveedores: 1,
      sucursales: 1,
      puestos: 1
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.logMessages.push(logMessage);
  }

  // Generar ID numérico secuencial
  generateNumericId(originalId, type = 'usuarios') {
    if (this.idMapping[type] && this.idMapping[type][originalId]) {
      return this.idMapping[type][originalId];
    }
    
    const numericId = this.idCounters[type]++;
    if (this.idMapping[type]) {
      this.idMapping[type][originalId] = numericId;
    }
    return numericId;
  }

  // Obtener ID numérico mapeado
  getNumericId(originalId, type = 'empleados') {
    if (!originalId) return null;
    return this.idMapping[type] ? this.idMapping[type][originalId] : null;
  }

  // Buscar ID de puesto por nombre
  async findPuestoId(nombrePuesto) {
    if (!nombrePuesto) return null;
    
    try {
      const result = await query('SELECT id FROM puestos WHERE nombre = $1', [nombrePuesto]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      this.log(`⚠️  Error buscando puesto ${nombrePuesto}: ${error.message}`);
      return null;
    }
  }

  // Buscar ID de sucursal por nombre
  async findSucursalId(nombreSucursal) {
    if (!nombreSucursal) return null;
    
    try {
      const result = await query('SELECT id FROM sucursales WHERE nombre = $1', [nombreSucursal]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      this.log(`⚠️  Error buscando sucursal ${nombreSucursal}: ${error.message}`);
      return null;
    }
  }

  async loadJsonData() {
    try {
      if (!fs.existsSync(this.jsonDbPath)) {
        throw new Error('Archivo db.json no encontrado');
      }
      
      const rawData = fs.readFileSync(this.jsonDbPath, 'utf8');
      const data = JSON.parse(rawData);
      this.log(`✅ Datos cargados desde ${this.jsonDbPath}`);
      return data;
    } catch (error) {
      this.log(`❌ Error cargando datos JSON: ${error.message}`);
      throw error;
    }
  }

  async migrateUsuarios(usuarios) {
    this.log('📊 Migrando usuarios...');
    
    for (const usuario of usuarios) {
      try {
        // Generar ID numérico secuencial si no existe o es string
        const userId = this.generateNumericId(usuario.id);
        
        await query(`
          INSERT INTO usuarios (
            username, password, nombre, email, role, roles,
            empleado_id, activo, fecha_registro, fecha_modificacion,
            ultimo_acceso, full_name, phone, bio, profile_image
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (username) DO UPDATE SET
            password = EXCLUDED.password,
            nombre = EXCLUDED.nombre,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            roles = EXCLUDED.roles,
            empleado_id = EXCLUDED.empleado_id,
            activo = EXCLUDED.activo,
            fecha_modificacion = EXCLUDED.fecha_modificacion,
            ultimo_acceso = EXCLUDED.ultimo_acceso,
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            bio = EXCLUDED.bio,
            profile_image = EXCLUDED.profile_image
        `, [
          usuario.username,
          usuario.password,
          usuario.nombre,
          usuario.email,
          usuario.role,
          JSON.stringify(usuario.roles || []),
          this.getNumericId(usuario.empleadoId),
          usuario.activo || true,
          dbUtils.formatDateForPostgreSQL(usuario.fechaRegistro),
          dbUtils.formatDateForPostgreSQL(usuario.fechaModificacion),
          dbUtils.formatDateForPostgreSQL(usuario.ultimoAcceso),
          usuario.fullName,
          usuario.phone,
          usuario.bio,
          usuario.profileImage
        ]);
        
        // Mapear el ID original al nuevo ID numérico
        this.idMapping.usuarios[usuario.id] = userId;
        
        this.log(`  ✓ Usuario migrado: ${usuario.username} (ID: ${userId})`);
      } catch (error) {
        this.log(`  ❌ Error migrando usuario ${usuario.username}: ${error.message}`);
      }
    }
    
    this.log(`✅ Migración de usuarios completada: ${usuarios.length} registros`);
  }

  async migrateEmpleados(empleados) {
    this.log('👥 Migrando empleados...');
    
    for (const empleado of empleados) {
      try {
        // Buscar IDs de puesto y sucursal
        const puestoId = await this.findPuestoId(empleado.puesto);
        const sucursalId = await this.findSucursalId(empleado.sucursal);
        
        // Insertar empleado sin especificar ID (auto-generado)
        const result = await query(`
          INSERT INTO empleados (
            nombre, email, telefono, puesto_id, sucursal_id, salario,
            fecha_ingreso, activo, fecha_baja, fecha_registro,
            fecha_modificacion, tipo_acceso, usuario_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `, [
          empleado.nombre,
          empleado.email,
          empleado.telefono,
          puestoId,
          sucursalId,
          empleado.salario || null,
          empleado.fechaIngreso,
          empleado.activo || true,
          empleado.fechaBaja || null,
          dbUtils.formatDateForPostgreSQL(empleado.fechaRegistro),
          dbUtils.formatDateForPostgreSQL(empleado.fechaModificacion),
          empleado.tipoAcceso,
          this.getNumericId(empleado.usuarioId, 'usuarios')
        ]);

        const empleadoId = result.rows[0].id;
        this.idMapping.empleados[empleado.id] = empleadoId;

        // Migrar módulos del empleado
        if (empleado.modulos) {
          for (const [modulo, config] of Object.entries(empleado.modulos)) {
            await query(`
              INSERT INTO empleados_modulos (empleado_id, modulo, acceso)
              VALUES ($1, $2, $3)
            `, [empleadoId, modulo, config.acceso || false]);
          }
        }
        
        this.log(`  ✓ Empleado migrado: ${empleado.nombre} (ID: ${empleadoId})`);
      } catch (error) {
        this.log(`  ❌ Error migrando empleado ${empleado.nombre}: ${error.message}`);
      }
    }
    
    this.log(`✅ Migración de empleados completada: ${empleados.length} registros`);
  }

  async migrateClientes(clientes) {
    this.log('🏢 Migrando clientes...');
    
    for (const cliente of clientes) {
      try {
        const direccion = cliente.direccion || {};
        
        const result = await query(`
          INSERT INTO clientes (
            rfc, razon_social, nombre_comercial, email, telefono,
            direccion_calle, direccion_numero, direccion_colonia,
            direccion_codigo_postal, direccion_ciudad, direccion_estado,
            regimen_fiscal, uso_cfdi, activo, fecha_registro, fecha_modificacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id
        `, [
          cliente.rfc,
          cliente.razonSocial,
          cliente.nombreComercial,
          cliente.email,
          cliente.telefono,
          direccion.calle,
          direccion.numero,
          direccion.colonia,
          direccion.codigoPostal,
          direccion.ciudad,
          direccion.estado,
          cliente.regimenFiscal,
          cliente.usoCfdi,
          cliente.activo || true,
          dbUtils.formatDateForPostgreSQL(cliente.fechaRegistro),
          dbUtils.formatDateForPostgreSQL(cliente.fechaModificacion)
        ]);
        
        const clienteId = result.rows[0].id;
        this.idMapping.clientes[cliente.id] = clienteId;
        
        this.log(`  ✓ Cliente migrado: ${cliente.razonSocial} (ID: ${clienteId})`);
      } catch (error) {
        this.log(`  ❌ Error migrando cliente ${cliente.razonSocial}: ${error.message}`);
      }
    }
    
    this.log(`✅ Migración de clientes completada: ${clientes.length} registros`);
  }

  async migrateProveedores(proveedores) {
    this.log('🏭 Migrando proveedores...');
    
    for (const proveedor of proveedores) {
      try {
        const result = await query(`
          INSERT INTO proveedores (
            nombre, rfc, email, telefono, direccion, codigo_postal,
            ciudad, estado, contacto, tipo_proveedor, condiciones_pago,
            notas, activo, fecha_registro, fecha_modificacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
        `, [
          proveedor.nombre,
          proveedor.rfc,
          proveedor.email,
          proveedor.telefono,
          proveedor.direccion,
          proveedor.codigoPostal,
          proveedor.ciudad,
          proveedor.estado,
          proveedor.contacto,
          proveedor.tipoProveedor,
          proveedor.condicionesPago,
          proveedor.notas,
          proveedor.activo || true,
          dbUtils.formatDateForPostgreSQL(proveedor.fechaRegistro),
          dbUtils.formatDateForPostgreSQL(proveedor.fechaModificacion)
        ]);
        
        const proveedorId = result.rows[0].id;
        this.idMapping.proveedores[proveedor.id] = proveedorId;
        
        this.log(`  ✓ Proveedor migrado: ${proveedor.nombre} (ID: ${proveedorId})`);
      } catch (error) {
        this.log(`  ❌ Error migrando proveedor ${proveedor.nombre}: ${error.message}`);
      }
    }
    
    this.log(`✅ Migración de proveedores completada: ${proveedores.length} registros`);
  }

  async migrateCatalogos(catalogos) {
    this.log('📂 Migrando catálogos...');
    
    // Migrar estados
    if (catalogos.estados) {
      for (const estado of catalogos.estados) {
        try {
          await query(`
            INSERT INTO estados (codigo, nombre, activo)
            VALUES ($1, $2, $3)
            ON CONFLICT (codigo) DO UPDATE SET
              nombre = EXCLUDED.nombre,
              activo = EXCLUDED.activo
          `, [estado.codigo, estado.nombre, true]);
        } catch (error) {
          this.log(`  ❌ Error migrando estado ${estado.codigo}: ${error.message}`);
        }
      }
      this.log(`  ✓ Estados migrados: ${catalogos.estados.length}`);
    }

    // Migrar regímenes fiscales
    if (catalogos.regimenesFiscales) {
      for (const regimen of catalogos.regimenesFiscales) {
        try {
          await query(`
            INSERT INTO regimenes_fiscales (codigo, descripcion, activo)
            VALUES ($1, $2, $3)
            ON CONFLICT (codigo) DO UPDATE SET
              descripcion = EXCLUDED.descripcion,
              activo = EXCLUDED.activo
          `, [regimen.codigo, regimen.descripcion, true]);
        } catch (error) {
          this.log(`  ❌ Error migrando régimen fiscal ${regimen.codigo}: ${error.message}`);
        }
      }
      this.log(`  ✓ Regímenes fiscales migrados: ${catalogos.regimenesFiscales.length}`);
    }

    // Migrar usos CFDI
    if (catalogos.usosCfdi) {
      for (const uso of catalogos.usosCfdi) {
        try {
          await query(`
            INSERT INTO usos_cfdi (codigo, descripcion, activo)
            VALUES ($1, $2, $3)
            ON CONFLICT (codigo) DO UPDATE SET
              descripcion = EXCLUDED.descripcion,
              activo = EXCLUDED.activo
          `, [uso.codigo, uso.descripcion, true]);
        } catch (error) {
          this.log(`  ❌ Error migrando uso CFDI ${uso.codigo}: ${error.message}`);
        }
      }
      this.log(`  ✓ Usos CFDI migrados: ${catalogos.usosCfdi.length}`);
    }

    // Migrar formas de pago
    if (catalogos.formasPago) {
      for (const forma of catalogos.formasPago) {
        try {
          await query(`
            INSERT INTO formas_pago (codigo, descripcion, activo)
            VALUES ($1, $2, $3)
            ON CONFLICT (codigo) DO UPDATE SET
              descripcion = EXCLUDED.descripcion,
              activo = EXCLUDED.activo
          `, [forma.codigo, forma.descripcion, true]);
        } catch (error) {
          this.log(`  ❌ Error migrando forma de pago ${forma.codigo}: ${error.message}`);
        }
      }
      this.log(`  ✓ Formas de pago migradas: ${catalogos.formasPago.length}`);
    }

    // Migrar métodos de pago
    if (catalogos.metodosPago) {
      for (const metodo of catalogos.metodosPago) {
        try {
          await query(`
            INSERT INTO metodos_pago (codigo, descripcion, activo)
            VALUES ($1, $2, $3)
            ON CONFLICT (codigo) DO UPDATE SET
              descripcion = EXCLUDED.descripcion,
              activo = EXCLUDED.activo
          `, [metodo.codigo, metodo.descripcion, true]);
        } catch (error) {
          this.log(`  ❌ Error migrando método de pago ${metodo.codigo}: ${error.message}`);
        }
      }
      this.log(`  ✓ Métodos de pago migrados: ${catalogos.metodosPago.length}`);
    }

    // Migrar módulos del sistema
    if (catalogos.modulos) {
      for (const modulo of catalogos.modulos) {
        try {
          await query(`
            INSERT INTO modulos (clave, nombre, icono, activo, orden)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (clave) DO UPDATE SET
              nombre = EXCLUDED.nombre,
              icono = EXCLUDED.icono,
              activo = EXCLUDED.activo,
              orden = EXCLUDED.orden
          `, [modulo.id, modulo.nombre, modulo.icono, modulo.activo || true, 0]);
        } catch (error) {
          this.log(`  ❌ Error migrando módulo ${modulo.id}: ${error.message}`);
        }
      }
      this.log(`  ✓ Módulos del sistema migrados: ${catalogos.modulos.length}`);
    }
    
    // Migrar sucursales DESPUÉS de los catálogos base (necesario para empleados)
    if (catalogos.sucursales) {
      for (const sucursal of catalogos.sucursales) {
        try {
          const result = await query(`
            INSERT INTO sucursales (nombre, direccion, telefono, gerente, activa, fecha_creacion)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (nombre) DO UPDATE SET
              direccion = EXCLUDED.direccion,
              telefono = EXCLUDED.telefono,
              gerente = EXCLUDED.gerente,
              activa = EXCLUDED.activa
            RETURNING id
          `, [
            sucursal.nombre,
            sucursal.direccion,
            sucursal.telefono,
            sucursal.gerente,
            sucursal.activa || true,
            dbUtils.formatDateForPostgreSQL(sucursal.fechaCreacion)
          ]);
          
          const sucursalId = result.rows[0].id;
          this.idMapping.sucursales[sucursal.id] = sucursalId;
          
        } catch (error) {
          this.log(`  ❌ Error migrando sucursal ${sucursal.nombre}: ${error.message}`);
        }
      }
      this.log(`  ✓ Sucursales migradas: ${catalogos.sucursales.length}`);
    }

    // Migrar puestos DESPUÉS de los catálogos base (necesario para empleados)
    if (catalogos.puestos) {
      for (const puesto of catalogos.puestos) {
        try {
          const result = await query(`
            INSERT INTO puestos (nombre, descripcion, salario_minimo, salario_maximo, activo, fecha_creacion)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (nombre) DO UPDATE SET
              descripcion = EXCLUDED.descripcion,
              salario_minimo = EXCLUDED.salario_minimo,
              salario_maximo = EXCLUDED.salario_maximo,
              activo = EXCLUDED.activo
            RETURNING id
          `, [
            puesto.nombre,
            puesto.descripcion,
            puesto.salarioMinimo,
            puesto.salarioMaximo,
            puesto.activo || true,
            dbUtils.formatDateForPostgreSQL(puesto.fechaCreacion)
          ]);
          
          const puestoId = result.rows[0].id;
          this.idMapping.puestos[puesto.id] = puestoId;
          
        } catch (error) {
          this.log(`  ❌ Error migrando puesto ${puesto.nombre}: ${error.message}`);
        }
      }
      this.log(`  ✓ Puestos migrados: ${catalogos.puestos.length}`);
    }
    
    this.log('✅ Migración de catálogos completada');
  }

  async runMigration() {
    try {
      this.log('🚀 Iniciando migración de LowDB a PostgreSQL...');
      
      // Inicializar conexión a la base de datos
      await initializeDatabase();
      
      // Cargar datos del archivo JSON
      const data = await this.loadJsonData();
      
      // Ejecutar migración en una transacción
      await transaction(async (queryTx) => {
        // Deshabilitar triggers temporalmente para mejor rendimiento
        await queryTx('SET session_replication_role = replica');
        
        try {
          // Migrar en orden correcto para manejar dependencias
          
          // 1. Primero los catálogos (sucursales y puestos)
          if (data.catalogos) await this.migrateCatalogos(data.catalogos);
          
          // 2. Luego empleados (dependen de sucursales y puestos)
          if (data.empleados) await this.migrateEmpleados(data.empleados);
          
          // 3. Después usuarios (pueden referenciar empleados)
          if (data.usuarios) await this.migrateUsuarios(data.usuarios);
          
          // 4. Finalmente clientes y proveedores (independientes)
          if (data.clientes) await this.migrateClientes(data.clientes);
          if (data.proveedores) await this.migrateProveedores(data.proveedores);
          
        } finally {
          // Rehabilitar triggers
          await queryTx('SET session_replication_role = DEFAULT');
        }
      });
      
      this.log('🎉 ¡Migración completada exitosamente!');
      
      // Generar reporte
      this.generateReport();
      
      // Mostrar estadísticas finales
      await this.showFinalStats();
      
    } catch (error) {
      this.log(`💥 Error durante la migración: ${error.message}`);
      throw error;
    }
  }

  async showFinalStats() {
    try {
      const result = await query('SELECT obtener_estadisticas_generales() as stats');
      const stats = result.rows[0].stats;
      
      this.log('📊 Estadísticas finales:');
      this.log(`  👥 Usuarios: ${stats.usuarios}`);
      this.log(`  🏢 Empleados: ${stats.empleados}`);
      this.log(`  📋 Clientes: ${stats.clientes}`);
      this.log(`  🏭 Proveedores: ${stats.proveedores}`);
      this.log(`  🏬 Sucursales: ${stats.sucursales}`);
      
    } catch (error) {
      this.log(`⚠️  No se pudieron obtener estadísticas: ${error.message}`);
    }
  }

  generateReport() {
    const reportPath = path.join(__dirname, '../migration-report.log');
    fs.writeFileSync(reportPath, this.logMessages.join('\n'));
    this.log(`📋 Reporte de migración guardado en: ${reportPath}`);
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  const migrator = new MigrationManager();
  migrator.runMigration()
    .then(() => {
      console.log('✅ Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

module.exports = MigrationManager;