/**
 * Script para limpiar clientes con estructura inconsistente
 * Elimina clientes con estructura antigua y deja solo los de prueba
 */

const fs = require('fs');
const path = require('path');

// Ruta del archivo de base de datos
const dbPath = path.join(__dirname, '..', 'db.json');

console.log('🧹 Limpiando clientes inconsistentes...');

try {
  // Leer la base de datos actual
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  // Contar clientes actuales
  const clientesActuales = dbData.clientes ? dbData.clientes.length : 0;
  console.log(`📊 Clientes actuales: ${clientesActuales}`);

  // Filtrar solo clientes con estructura correcta (que tengan direccionEntrega o razon)
  const clientesCorrectos = dbData.clientes.filter(cliente => {
    // Mantener solo clientes que tengan la estructura correcta
    return (
      cliente.hasOwnProperty('direccionEntrega') || 
      cliente.hasOwnProperty('razon') || 
      cliente.hasOwnProperty('segundoTelefono') ||
      cliente.hasOwnProperty('cp') ||
      cliente.hasOwnProperty('cfdi')
    );
  });

  // Si no hay clientes correctos, crear datos de prueba
  if (clientesCorrectos.length === 0) {
    console.log('ℹ️ No se encontraron clientes con estructura correcta, creando datos de prueba...');
    
    dbData.clientes = [
      {
        "id": "CLI_TEST_001",
        "nombre": "Cliente Test 1",
        "telefono": "961-111-1111",
        "segundoTelefono": "",
        "email": "test1@ejemplo.com",
        "direccionEntrega": "Av. Test 123, Tuxtla Gutiérrez, Chiapas",
        "razon": "Cliente Test 1 S.A. de C.V.",
        "rfc": "CTE850315T01",
        "regimen": "601 - General de Ley Personas Morales",
        "direccion": "Av. Test 123, Tuxtla Gutiérrez, Chiapas",
        "cp": "29000",
        "cfdi": "G01 - Adquisición de mercancías",
        "activo": true,
        "fechaRegistro": new Date().toISOString(),
        "fechaModificacion": null
      },
      {
        "id": "CLI_TEST_002",
        "nombre": "Cliente Test 2",
        "telefono": "961-222-2222",
        "segundoTelefono": "961-222-2223",
        "email": "test2@ejemplo.com",
        "direccionEntrega": "Blvd. Test 456, Tuxtla Gutiérrez, Chiapas",
        "razon": "María Test González",
        "rfc": "TEGM750425T02",
        "regimen": "612 - Personas Físicas con Actividades Empresariales",
        "direccion": "Blvd. Test 456, Tuxtla Gutiérrez, Chiapas",
        "cp": "29030",
        "cfdi": "G03 - Gastos en general",
        "activo": true,
        "fechaRegistro": new Date().toISOString(),
        "fechaModificacion": null
      }
    ];
  } else {
    console.log(`ℹ️ Manteniendo ${clientesCorrectos.length} clientes con estructura correcta`);
    dbData.clientes = clientesCorrectos;
  }

  // Guardar la base de datos actualizada
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');

  const clientesFinales = dbData.clientes.length;
  console.log('✅ Limpieza completada');
  console.log(`📊 Clientes: ${clientesActuales} → ${clientesFinales}`);
  console.log('📋 Clientes mantenidos:');
  dbData.clientes.forEach((cliente, index) => {
    console.log(`   ${index + 1}. ${cliente.nombre} (${cliente.id})`);
    if (cliente.rfc) console.log(`      RFC: ${cliente.rfc}`);
  });

} catch (error) {
  console.error('❌ Error limpiando clientes:', error.message);
  process.exit(1);
}