/**
 * Script para crear una plantilla Excel de prueba
 * Verifica que la carga masiva guarde correctamente ambas direcciones
 */

const XLSX = require('xlsx');
const path = require('path');

// Crear datos de prueba con direcciones claramente diferentes
const datosPrueba = [
  {
    'nombre': 'Prueba Direcciones Diferentes',
    'telefono': '9611111111',
    'segundo telefono': '',
    'correo': 'prueba1@test.com',
    'direccion de entrega': 'ENTREGA: Bodega 10, Zona Industrial Norte',
    'razon social': 'Prueba Direcciones Diferentes',
    'rfc': 'PDD123456ABC',
    'regimen fiscal': '612',
    'direccion de facturacion': 'FACTURACION: Oficina Central, Av. Principal 100',
    'codigo postal': '29000',
    'uso cfdi': 'G03'
  },
  {
    'nombre': 'Prueba Direcciones Iguales',
    'telefono': '9612222222',
    'segundo telefono': '',
    'correo': 'prueba2@test.com',
    'direccion de entrega': 'Calle Única 200, Col. Centro',
    'razon social': 'Prueba Direcciones Iguales',
    'rfc': 'PDI789012DEF',
    'regimen fiscal': '601',
    'direccion de facturacion': 'Calle Única 200, Col. Centro',
    'codigo postal': '29030',
    'uso cfdi': 'G01'
  }
];

// Crear workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(datosPrueba);

// Configurar anchos
ws['!cols'] = [
  { wch: 30 }, // nombre
  { wch: 15 }, // telefono
  { wch: 15 }, // segundo telefono
  { wch: 25 }, // correo
  { wch: 50 }, // direccion de entrega
  { wch: 30 }, // razon social
  { wch: 15 }, // rfc
  { wch: 15 }, // regimen fiscal
  { wch: 50 }, // direccion de facturacion
  { wch: 12 }, // codigo postal
  { wch: 10 }  // uso cfdi
];

XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

// Guardar
const filePath = path.join(__dirname, '..', 'uploads', 'test_direcciones.xlsx');
XLSX.writeFile(wb, filePath);

console.log('✅ Archivo de prueba creado:', filePath);
console.log('📝 Contiene 2 registros:');
console.log('   1. Direcciones DIFERENTES (para verificar separación)');
console.log('   2. Direcciones IGUALES (para verificar caso común)');
