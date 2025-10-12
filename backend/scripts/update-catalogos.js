const fs = require('fs');
const path = require('path');
const catalogosCompletos = require('../utils/catalogosCompletos');

/**
 * Script para poblar catálogos completos en db.json
 * Elimina datos hardcodeados del frontend y los centraliza en BD
 */

class CatalogosUpdater {
  constructor() {
    this.dbPath = path.join(__dirname, '../db.json');
  }

  async updateCatalogos() {
    console.log('🔄 Actualizando catálogos en db.json...');
    
    try {
      // Leer archivo actual
      const dbData = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      
      // Backup del archivo original
      const backupPath = path.join(__dirname, '../db.backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(dbData, null, 2));
      console.log(`📋 Backup creado en: ${backupPath}`);

      // Actualizar catálogos con datos completos
      dbData.catalogos = {
        ...dbData.catalogos,
        ...catalogosCompletos
      };

      // Guardar archivo actualizado
      fs.writeFileSync(this.dbPath, JSON.stringify(dbData, null, 2));
      
      console.log('✅ Catálogos actualizados exitosamente');
      console.log('📊 Resumen de actualizaciones:');
      console.log(`   - Estados: ${catalogosCompletos.estados.length} (32 entidades federativas)`);
      console.log(`   - Regímenes Fiscales: ${catalogosCompletos.regimenesFiscales.length} (catálogo SAT completo)`);
      console.log(`   - Usos CFDI: ${catalogosCompletos.usosCfdi.length} (catálogo SAT completo)`);
      console.log(`   - Formas de Pago: ${catalogosCompletos.formasPago.length} (catálogo SAT completo)`);
      console.log(`   - Métodos de Pago: ${catalogosCompletos.metodosPago.length} registros`);
      console.log(`   - Módulos del Sistema: ${catalogosCompletos.modulos.length} módulos`);

      this.generateReport(dbData.catalogos);
      
    } catch (error) {
      console.error('❌ Error actualizando catálogos:', error.message);
      throw error;
    }
  }

  generateReport(catalogos) {
    console.log('\n📋 REPORTE DETALLADO DE CATÁLOGOS:');
    console.log('='.repeat(60));
    
    Object.keys(catalogos).forEach(catalog => {
      const data = catalogos[catalog];
      if (Array.isArray(data)) {
        console.log(`\n${catalog.toUpperCase()}:`);
        console.log(`   Total registros: ${data.length}`);
        
        if (data.length > 0) {
          const firstItem = data[0];
          const keys = Object.keys(firstItem);
          console.log(`   Campos: ${keys.join(', ')}`);
          
          // Mostrar algunos ejemplos
          const examples = data.slice(0, 3);
          examples.forEach((item, index) => {
            const display = item.codigo ? `${item.codigo} - ${item.descripcion || item.nombre}` : 
                           item.clave ? `${item.clave} - ${item.nombre}` :
                           item.nombre || JSON.stringify(item);
            console.log(`   [${index + 1}] ${display}`);
          });
          
          if (data.length > 3) {
            console.log(`   ... y ${data.length - 3} más`);
          }
        }
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PRÓXIMOS PASOS:');
    console.log('1. Eliminar datos hardcodeados del frontend');
    console.log('2. Actualizar servicios para consumir estos catálogos');
    console.log('3. Migrar estos datos a PostgreSQL');
    console.log('4. Actualizar controllers para servir catálogos desde BD');
  }
}

// Ejecutar actualización si este archivo se ejecuta directamente
if (require.main === module) {
  const updater = new CatalogosUpdater();
  
  updater.updateCatalogos()
    .then(() => {
      console.log('\n✅ Actualización de catálogos completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error en actualización:', error);
      process.exit(1);
    });
}

module.exports = CatalogosUpdater;