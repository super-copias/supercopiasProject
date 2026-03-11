/**
 * Generador de plantilla Excel para carga masiva de clientes
 * Crea un archivo con columnas correctas, datos de muestra,
 * hojas de catálogo (Regímenes Fiscales y Usos CFDI)
 * y validaciones de datos (dropdown) en las columnas correspondientes.
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

async function generarPlantillaClientes() {
  // Consultar catálogos desde la base de datos
  const resRegimenes = await query(
    'SELECT codigo, descripcion FROM regimenes_fiscales WHERE activo = true ORDER BY codigo'
  );
  const resUsosCfdi = await query(
    'SELECT codigo, descripcion FROM usos_cfdi WHERE activo = true ORDER BY codigo'
  );

  const regimenes = resRegimenes.rows;   // [{ codigo, descripcion }, ...]
  const usosCfdi  = resUsosCfdi.rows;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SuperCopias';
  workbook.created = new Date();

  // ==========================================================
  // Hoja 1: Catálogo – Regímenes Fiscales
  // ==========================================================
  const wsRegimenes = workbook.addWorksheet('Regimenes Fiscales');
  wsRegimenes.columns = [
    { header: 'Código',      key: 'codigo',      width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 65 }
  ];

  // Estilo cabecera
  const hdrRegCell = wsRegimenes.getRow(1);
  hdrRegCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdrRegCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F7244' } };
  hdrRegCell.alignment = { vertical: 'middle', horizontal: 'center' };

  regimenes.forEach(r => wsRegimenes.addRow([r.codigo, r.descripcion]));

  // Proteger hoja de catálogo para evitar edición accidental (sin contraseña)
  wsRegimenes.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // ==========================================================
  // Hoja 2: Catálogo – Usos CFDI
  // ==========================================================
  const wsUsosCfdi = workbook.addWorksheet('Usos CFDI');
  wsUsosCfdi.columns = [
    { header: 'Código',      key: 'codigo',      width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 65 }
  ];

  const hdrCfdiCell = wsUsosCfdi.getRow(1);
  hdrCfdiCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdrCfdiCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F7244' } };
  hdrCfdiCell.alignment = { vertical: 'middle', horizontal: 'center' };

  usosCfdi.forEach(r => wsUsosCfdi.addRow([r.codigo, r.descripcion]));

  wsUsosCfdi.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // ==========================================================
  // Hoja 3: Clientes (hoja principal de carga)
  // ==========================================================
  const wsClientes = workbook.addWorksheet('Clientes');

  // Columnas: A-K
  // H = regimen fiscal (índice 8), K = uso cfdi (índice 11)
  wsClientes.columns = [
    { header: 'nombre',                   key: 'nombre',           width: 32 },  // A
    { header: 'telefono',                 key: 'telefono',         width: 16 },  // B
    { header: 'segundo telefono',         key: 'segundo_tel',      width: 18 },  // C
    { header: 'correo',                   key: 'correo',           width: 28 },  // D
    { header: 'segundo correo',           key: 'segundo_correo',   width: 28 },  // E
    { header: 'direccion de entrega',     key: 'dir_entrega',      width: 52 },  // F
    { header: 'razon social',             key: 'razon_social',     width: 32 },  // G
    { header: 'rfc',                      key: 'rfc',              width: 16 },  // H
    { header: 'regimen fiscal',           key: 'regimen_fiscal',   width: 20 },  // I
    { header: 'direccion de facturacion', key: 'dir_facturacion',  width: 52 },  // J
    { header: 'codigo postal',            key: 'codigo_postal',    width: 14 },  // K
    { header: 'uso cfdi',                 key: 'uso_cfdi',         width: 14 }   // L
  ];

  // Estilo cabecera de la hoja principal
  const hdrClientes = wsClientes.getRow(1);
  hdrClientes.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hdrClientes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F7244' } };
  hdrClientes.alignment = { vertical: 'middle', horizontal: 'center' };
  hdrClientes.height = 20;

  // Datos de ejemplo
  const ejemplos = [
    ['Juan Pérez García',                  '9611234567', '9611234568', 'juan.perez@email.com',   'juan.alt@email.com',
     'Av. Central 123, Local 5, Col. Centro, Tuxtla Gutiérrez, Chiapas',
     'Juan Pérez García', 'PEGJ850315ABC', '612',
     'Av. Central 123, Col. Centro, Tuxtla Gutiérrez, Chiapas', '29000', 'G03'],
    ['Comercializadora López S.A. de C.V.', '9612345678', '', '',                                 '',
     'Bodega 3, Parque Industrial, Tuxtla Gutiérrez, Chiapas',
     'Comercializadora López S.A. de C.V.', 'CLS920810XYZ', '601',
     'Blvd. Belisario Domínguez 456, Col. Moctezuma, Tuxtla Gutiérrez, Chiapas', '29030', 'G01'],
    ['María González Hernández',            '9673456789', '9673456790', 'maria.gonzalez@email.com', '',
     'Real de Guadalupe 789, Centro, San Cristóbal de las Casas, Chiapas',
     'María González Hernández', 'GOHM750425DEF', '612',
     'Real de Guadalupe 789, Centro, San Cristóbal de las Casas, Chiapas', '29200', 'G03']
  ];
  ejemplos.forEach(row => wsClientes.addRow(row));

  // ----------------------------------------------------------
  // Validaciones de datos (dropdown) para regimen fiscal y uso cfdi
  // Las fórmulas hacen referencia a las hojas de catálogo
  // ----------------------------------------------------------
  const maxRows = 1000; // filas con validación activa
  const regFiscalFmla = `'Regimenes Fiscales'!$A$2:$A$${regimenes.length + 1}`;
  const usosCfdiFmla  = `'Usos CFDI'!$A$2:$A$${usosCfdi.length + 1}`;

  // Columna I: regimen fiscal (se desplaza una columna por 'segundo correo' en E)
  wsClientes.dataValidations.add(`I2:I${maxRows}`, {
    type: 'list',
    allowBlank: true,
    formulae: [regFiscalFmla],
    showErrorMessage: true,
    errorStyle: 'error',
    errorTitle: 'Régimen Fiscal inválido',
    error: 'Seleccione un código de régimen fiscal de la lista (hoja "Regimenes Fiscales")'
  });

  // Columna L: uso cfdi
  wsClientes.dataValidations.add(`L2:L${maxRows}`, {
    type: 'list',
    allowBlank: true,
    formulae: [usosCfdiFmla],
    showErrorMessage: true,
    errorStyle: 'error',
    errorTitle: 'Uso CFDI inválido',
    error: 'Seleccione un código de uso CFDI de la lista (hoja "Usos CFDI")'
  });

  // Mostrar todas las hojas en el tab bar; abrir con la hoja Clientes activa
  workbook.views = [{ firstSheet: 0, activeTab: 2 }];

  // ==========================================================
  // Guardar archivo
  // ==========================================================
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, 'plantilla_clientes.xlsx');
  await workbook.xlsx.writeFile(filePath);

  console.log(`✅ Plantilla generada: ${filePath}`);
  return filePath;
}

// Exportar función
module.exports = { generarPlantillaClientes };

// Si se ejecuta directamente, generar la plantilla
if (require.main === module) {
  generarPlantillaClientes().catch(err => {
    console.error('Error generando plantilla:', err);
    process.exit(1);
  });
}