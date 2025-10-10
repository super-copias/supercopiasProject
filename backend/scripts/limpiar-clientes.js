/**
 * Script para limpiar datos de clientes
 * Mantiene solo datos mínimos para testing
 */

const fs = require('fs');
const path = require('path');

// Ruta del archivo de base de datos
const dbPath = path.join(__dirname, '..', 'db.json');

console.log('🧹 Limpiando datos de clientes...');

try {
  // Leer la base de datos actual
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  // Contar clientes actuales
  const clientesActuales = dbData.clientes ? dbData.clientes.length : 0;
  console.log(`📊 Clientes actuales: ${clientesActuales}`);

  // Datos limpios de clientes (solo 2 ejemplos básicos)
  const clientesLimpios = [
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

  // Reemplazar los clientes en la base de datos
  dbData.clientes = clientesLimpios;

  // Guardar la base de datos actualizada
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');

  console.log('✅ Datos de clientes limpiados exitosamente');
  console.log(`📊 Clientes restantes: ${clientesLimpios.length}`);
  console.log('📋 Clientes de testing creados:');
  clientesLimpios.forEach((cliente, index) => {
    console.log(`   ${index + 1}. ${cliente.nombre} (${cliente.id})`);
    console.log(`      RFC: ${cliente.rfc} | Tel: ${cliente.telefono}`);
  });

} catch (error) {
  console.error('❌ Error limpiando clientes:', error.message);
  process.exit(1);
}