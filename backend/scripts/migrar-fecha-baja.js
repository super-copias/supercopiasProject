/**
 * Script para migrar datos existentes agregando el campo fechaBaja
 * Ejecutar en el backend: node scripts/migrar-fecha-baja.js
 */

const { db, init } = require('../db');

function migrarFechaBaja() {
  init(); // Inicializar BD

  console.log('🔄 Migrando empleados para agregar campo fechaBaja...\n');

  // Obtener todos los empleados
  const empleados = db.get('empleados').value() || [];
  
  if (empleados.length === 0) {
    console.log('❌ No hay empleados para migrar');
    return;
  }

  let empleadosActualizados = 0;

  // Agregar campo fechaBaja a todos los empleados que no lo tengan
  const empleadosMigrados = empleados.map(empleado => {
    if (!empleado.hasOwnProperty('fechaBaja')) {
      empleadosActualizados++;
      return {
        ...empleado,
        fechaBaja: empleado.activo === false ? new Date().toISOString().split('T')[0] : null
      };
    }
    return empleado;
  });

  // Guardar cambios
  db.set('empleados', empleadosMigrados).write();

  console.log(`✅ Migración completada!`);
  console.log(`📊 Estadísticas:`);
  console.log(`   - Total de empleados: ${empleados.length}`);
  console.log(`   - Empleados actualizados: ${empleadosActualizados}`);
  console.log(`   - Empleados ya migrados: ${empleados.length - empleadosActualizados}`);
  
  // Mostrar empleados inactivos que obtuvieron fechaBaja
  const inactivos = empleadosMigrados.filter(emp => emp.activo === false && emp.fechaBaja);
  if (inactivos.length > 0) {
    console.log(`\n📋 Empleados inactivos con fechaBaja asignada:`);
    inactivos.forEach(emp => {
      console.log(`   - ${emp.nombre} (${emp.id}) - Fecha de baja: ${emp.fechaBaja}`);
    });
  }

  console.log('\n🚀 ¡Campo fechaBaja agregado exitosamente a todos los empleados!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrarFechaBaja();
}

module.exports = { migrarFechaBaja };