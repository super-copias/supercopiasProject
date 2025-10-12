/**
 * Script de Simulación de Migración PostgreSQL
 * Valida la estructura y proceso de migración sin necesidad de PostgreSQL
 */

const fs = require('fs');
const path = require('path');

class MigrationSimulator {
  constructor() {
    this.jsonDbPath = path.join(__dirname, '../db.json');
    this.sqlSchemaPath = path.join(__dirname, '../BD_SUPERCOPIAS_POSTGRES.sql');
    this.logMessages = [];
    this.results = {
      schemaValidation: false,
      dataValidation: false,
      structureValidation: false,
      mappingValidation: false
    };
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    this.logMessages.push(logMessage);
  }

  mapCollectionIds(collection, data, idMapping) {
    idMapping[collection] = {};
    let totalMappings = 0;
    
    data.forEach((record, index) => {
      if (record.id) {
        const oldId = record.id;
        const newId = index + 1;
        idMapping[collection][oldId] = newId;
        totalMappings++;
        
        // Solo mostrar algunos ejemplos para no saturar el log
        if (index < 3) {
          this.log(`🔄 ${collection}: '${oldId}' → ${newId}`);
        }
      }
    });
    
    this.log(`📊 ${collection}: ${Object.keys(idMapping[collection]).length} IDs mapeados`);
    return totalMappings;
  }

  async validateSchema() {
    this.log('🔍 Validando esquema PostgreSQL...');
    
    try {
      if (!fs.existsSync(this.sqlSchemaPath)) {
        throw new Error('Archivo de schema PostgreSQL no encontrado');
      }

      const schemaContent = fs.readFileSync(this.sqlSchemaPath, 'utf8');
      
      // Validar elementos críticos del schema
      const requiredTables = [
        'usuarios', 'empleados', 'clientes', 'proveedores', 
        'sucursales', 'puestos', 'empleados_modulos'
      ];
      
      const requiredElements = [
        'SERIAL PRIMARY KEY',
        'FOREIGN KEY',
        'CREATE TABLE',
        'CREATE INDEX'
      ];

      let validTables = 0;
      let validElements = 0;

      requiredTables.forEach(table => {
        if (schemaContent.includes(`CREATE TABLE ${table}`)) {
          validTables++;
          this.log(`✅ Tabla ${table} encontrada en schema`);
        } else {
          this.log(`❌ Tabla ${table} NO encontrada en schema`, 'ERROR');
        }
      });

      requiredElements.forEach(element => {
        if (schemaContent.includes(element)) {
          validElements++;
          this.log(`✅ Elemento ${element} encontrado en schema`);
        } else {
          this.log(`❌ Elemento ${element} NO encontrado en schema`, 'ERROR');
        }
      });

      // Validar IDs numéricas (SERIAL)
      const serialCount = (schemaContent.match(/id SERIAL PRIMARY KEY/g) || []).length;
      this.log(`📊 Total de IDs SERIAL encontradas: ${serialCount}`);

      this.results.schemaValidation = (validTables === requiredTables.length && validElements === requiredElements.length);
      
      if (this.results.schemaValidation) {
        this.log('✅ Validación de schema EXITOSA', 'SUCCESS');
      } else {
        this.log('❌ Validación de schema FALLIDA', 'ERROR');
      }

    } catch (error) {
      this.log(`❌ Error validando schema: ${error.message}`, 'ERROR');
      this.results.schemaValidation = false;
    }
  }

  async validateJsonData() {
    this.log('🔍 Validando datos JSON existentes...');
    
    try {
      if (!fs.existsSync(this.jsonDbPath)) {
        throw new Error('Archivo db.json no encontrado');
      }

      const jsonData = JSON.parse(fs.readFileSync(this.jsonDbPath, 'utf8'));
      
      const expectedCollections = [
        'usuarios', 'empleados', 'clientes', 'proveedores',
        'sucursales', 'puestos'
      ];

      let validCollections = 0;
      let totalRecords = 0;

      expectedCollections.forEach(collection => {
        let data = jsonData[collection];
        let collectionPath = collection;
        
        // Manejar colecciones que están dentro de 'catalogos'
        if (!data && jsonData.catalogos && jsonData.catalogos[collection]) {
          data = jsonData.catalogos[collection];
          collectionPath = `catalogos.${collection}`;
        }
        
        if (data && Array.isArray(data)) {
          const count = data.length;
          totalRecords += count;
          validCollections++;
          this.log(`✅ Colección '${collectionPath}': ${count} registros`);
          
          // Validar estructura de IDs existentes
          if (count > 0) {
            const firstRecord = data[0];
            if (firstRecord.id) {
              this.log(`📋 Ejemplo ID en ${collection}: '${firstRecord.id}' (tipo: ${typeof firstRecord.id})`);
            }
          }
        } else {
          this.log(`❌ Colección '${collection}' no encontrada o inválida`, 'ERROR');
        }
      });

      this.log(`📊 Total de registros a migrar: ${totalRecords}`);
      
      this.results.dataValidation = (validCollections === expectedCollections.length);
      
      if (this.results.dataValidation) {
        this.log('✅ Validación de datos JSON EXITOSA', 'SUCCESS');
      } else {
        this.log('❌ Validación de datos JSON FALLIDA', 'ERROR');
      }

      return jsonData;

    } catch (error) {
      this.log(`❌ Error validando datos JSON: ${error.message}`, 'ERROR');
      this.results.dataValidation = false;
      return null;
    }
  }

  async validateMigrationStructure() {
    this.log('🔍 Validando estructura de migración...');
    
    try {
      const migrationScript = path.join(__dirname, 'migrate-to-postgres.js');
      
      if (!fs.existsSync(migrationScript)) {
        throw new Error('Script de migración no encontrado');
      }

      const scriptContent = fs.readFileSync(migrationScript, 'utf8');
      
      const requiredFunctions = [
        'generateNumericId',
        'migrateUsuarios',
        'migrateEmpleados',
        'migrateClientes',
        'runMigration'
      ];

      const requiredFeatures = [
        'idMapping',
        'transaction',
        'RETURNING',
        'Foreign Key'
      ];

      let validFunctions = 0;
      let validFeatures = 0;

      requiredFunctions.forEach(func => {
        if (scriptContent.includes(func)) {
          validFunctions++;
          this.log(`✅ Función ${func} encontrada`);
        } else {
          this.log(`❌ Función ${func} NO encontrada`, 'ERROR');
        }
      });

      requiredFeatures.forEach(feature => {
        if (scriptContent.includes(feature)) {
          validFeatures++;
          this.log(`✅ Característica ${feature} encontrada`);
        } else {
          this.log(`❌ Característica ${feature} NO encontrada`, 'ERROR');
        }
      });

      this.results.structureValidation = (validFunctions >= 4 && validFeatures >= 3);
      
      if (this.results.structureValidation) {
        this.log('✅ Validación de estructura de migración EXITOSA', 'SUCCESS');
      } else {
        this.log('❌ Validación de estructura de migración FALLIDA', 'ERROR');
      }

    } catch (error) {
      this.log(`❌ Error validando estructura de migración: ${error.message}`, 'ERROR');
      this.results.structureValidation = false;
    }
  }

  async simulateIdMapping(jsonData) {
    this.log('🔍 Simulando mapeo de IDs string → numeric...');
    
    try {
      if (!jsonData) {
        throw new Error('No hay datos JSON para simular');
      }

      const idMapping = {};
      let totalMappings = 0;

      Object.keys(jsonData).forEach(collection => {
        if (Array.isArray(jsonData[collection])) {
          totalMappings += this.mapCollectionIds(collection, jsonData[collection], idMapping);
        }
      });
      
      // Manejar catalogos anidados
      if (jsonData.catalogos) {
        Object.keys(jsonData.catalogos).forEach(collection => {
          if (Array.isArray(jsonData.catalogos[collection])) {
            totalMappings += this.mapCollectionIds(collection, jsonData.catalogos[collection], idMapping);
          }
        });
      }

      this.log(`📊 Total de mapeos de ID generados: ${totalMappings}`);
      
      // Simular validación de Foreign Keys
      this.log('🔍 Simulando validación de Foreign Keys...');
      
      if (jsonData.usuarios && jsonData.empleados) {
        let validForeignKeys = 0;
        jsonData.usuarios.forEach(usuario => {
          if (usuario.empleadoId && idMapping.empleados[usuario.empleadoId]) {
            validForeignKeys++;
          }
        });
        this.log(`✅ Foreign Keys válidos simulados: ${validForeignKeys}`);
      }

      this.results.mappingValidation = (totalMappings > 0);
      
      if (this.results.mappingValidation) {
        this.log('✅ Simulación de mapeo de IDs EXITOSA', 'SUCCESS');
      } else {
        this.log('❌ Simulación de mapeo de IDs FALLIDA', 'ERROR');
      }

    } catch (error) {
      this.log(`❌ Error simulando mapeo de IDs: ${error.message}`, 'ERROR');
      this.results.mappingValidation = false;
    }
  }

  generateReport() {
    this.log('📋 Generando reporte final...');
    
    const allValidationsPass = Object.values(this.results).every(result => result === true);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 REPORTE DE VALIDACIÓN DE MIGRACIÓN POSTGRESQL');
    console.log('='.repeat(60));
    
    console.log('\n📊 RESULTADOS:');
    console.log(`Schema PostgreSQL: ${this.results.schemaValidation ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
    console.log(`Datos JSON: ${this.results.dataValidation ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
    console.log(`Estructura Migración: ${this.results.structureValidation ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    console.log(`Mapeo de IDs: ${this.results.mappingValidation ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
    
    console.log('\n🎯 RESULTADO GENERAL:');
    if (allValidationsPass) {
      console.log('✅ MIGRACIÓN LISTA PARA EJECUTAR');
      console.log('🚀 Todos los componentes están preparados correctamente');
    } else {
      console.log('❌ MIGRACIÓN REQUIERE CORRECCIONES');
      console.log('⚠️ Revisar errores antes de proceder');
    }
    
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('1. Instalar PostgreSQL (ver INSTALACION_POSTGRESQL.md)');
    console.log('2. Configurar credenciales en .env');
    console.log('3. Ejecutar: node scripts/migrate-to-postgres.js');
    console.log('4. Verificar migración con consultas SQL');
    
    console.log('\n' + '='.repeat(60));
    
    // Guardar log
    const reportPath = path.join(__dirname, '../migration-simulation-log.txt');
    fs.writeFileSync(reportPath, this.logMessages.join('\n'));
    console.log(`📄 Log detallado guardado en: ${reportPath}`);
    
    return allValidationsPass;
  }

  async runSimulation() {
    console.log('🚀 Iniciando simulación de migración PostgreSQL...\n');
    
    await this.validateSchema();
    const jsonData = await this.validateJsonData();
    await this.validateMigrationStructure();
    await this.simulateIdMapping(jsonData);
    
    return this.generateReport();
  }
}

// Ejecutar simulación si este archivo se ejecuta directamente
if (require.main === module) {
  const simulator = new MigrationSimulator();
  
  simulator.runSimulation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Error en simulación:', error);
      process.exit(1);
    });
}

module.exports = MigrationSimulator;