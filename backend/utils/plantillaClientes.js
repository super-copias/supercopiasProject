/**
 * Generador de plantilla Excel para carga masiva de clientes
 * Crea un archivo de ejemplo con las columnas correctas y datos de muestra
 */

const XLSX = require('xlsx');
const path = require('path');

function generarPlantillaClientes() {
  // Datos de ejemplo para la plantilla
  const datosEjemplo = [
    {
      'nombre': 'Juan Pérez García',
      'telefono': '961-123-4567',
      'segundo telefono': '961-123-4568',
      'correo': 'juan.perez@email.com',
      'direccion de entrega': 'Av. Central 123, Col. Centro, Tuxtla Gutiérrez, Chiapas',
      'razon social': 'Juan Pérez García',
      'rfc': 'PEGJ850315ABC',
      'regimen fiscal': '612 - Personas Físicas con Actividades Empresariales',
      'direccion': 'Av. Central 123, Col. Centro, Tuxtla Gutiérrez, Chiapas',
      'codigo postal': '29000',
      'uso cfdi': 'G03 - Gastos en general'
    },
    {
      'nombre': 'Comercializadora López S.A. de C.V.',
      'telefono': '961-234-5678',
      'segundo telefono': '',
      'correo': '',
      'direccion de entrega': 'Blvd. Belisario Domínguez 456, Col. Moctezuma, Tuxtla Gutiérrez, Chiapas',
      'razon social': 'Comercializadora López S.A. de C.V.',
      'rfc': 'CLS920810XYZ',
      'regimen fiscal': '601 - General de Ley Personas Morales',
      'direccion': 'Blvd. Belisario Domínguez 456, Col. Moctezuma, Tuxtla Gutiérrez, Chiapas',
      'codigo postal': '29030',
      'uso cfdi': 'G01 - Adquisición de mercancías'
    },
    {
      'nombre': 'María González Hernández',
      'telefono': '967-345-6789',
      'segundo telefono': '967-345-6790',
      'correo': 'maria.gonzalez@email.com',
      'direccion de entrega': 'Real de Guadalupe 789, Centro, San Cristóbal de las Casas, Chiapas',
      'razon social': 'María González Hernández',
      'rfc': 'GOHM750425DEF',
      'regimen fiscal': '612 - Personas Físicas con Actividades Empresariales',
      'direccion': 'Real de Guadalupe 789, Centro, San Cristóbal de las Casas, Chiapas',
      'codigo postal': '29200',
      'uso cfdi': 'G03 - Gastos en general'
    }
  ];

  // Crear libro de Excel
  const wb = XLSX.utils.book_new();
  
  // Crear hoja con los datos de ejemplo
  const ws = XLSX.utils.json_to_sheet(datosEjemplo);
  
  // Configurar anchos de columna
  const colWidths = [
    { wch: 30 }, // nombre
    { wch: 15 }, // telefono
    { wch: 15 }, // segundo telefono
    { wch: 25 }, // correo
    { wch: 50 }, // direccion de entrega
    { wch: 30 }, // razon social
    { wch: 15 }, // rfc
    { wch: 40 }, // regimen fiscal
    { wch: 40 }, // direccion
    { wch: 12 }, // codigo postal
    { wch: 35 }  // uso cfdi
  ];
  
  ws['!cols'] = colWidths;
  
  // Agregar la hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  
  // Definir ruta del archivo
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const filePath = path.join(uploadsDir, 'plantilla_clientes.xlsx');
  
  // Crear directorio si no existe
  const fs = require('fs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Guardar archivo
  XLSX.writeFile(wb, filePath);
  
  console.log(`✅ Plantilla generada: ${filePath}`);
  return filePath;
}

// Exportar función
module.exports = { generarPlantillaClientes };

// Si se ejecuta directamente, generar la plantilla
if (require.main === module) {
  generarPlantillaClientes();
}