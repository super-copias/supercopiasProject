// Script para completar catálogos oficiales en la base de datos
// Datos oficiales del SAT (Servicio de Administración Tributaria)

const catalogosCompletos = {
  estados: [
    { "codigo": "AGU", "nombre": "Aguascalientes" },
    { "codigo": "BCN", "nombre": "Baja California" },
    { "codigo": "BCS", "nombre": "Baja California Sur" },
    { "codigo": "CAM", "nombre": "Campeche" },
    { "codigo": "CHP", "nombre": "Chiapas" },
    { "codigo": "CHH", "nombre": "Chihuahua" },
    { "codigo": "CMX", "nombre": "Ciudad de México" },
    { "codigo": "COA", "nombre": "Coahuila" },
    { "codigo": "COL", "nombre": "Colima" },
    { "codigo": "DUR", "nombre": "Durango" },
    { "codigo": "MEX", "nombre": "Estado de México" },
    { "codigo": "GUA", "nombre": "Guanajuato" },
    { "codigo": "GRO", "nombre": "Guerrero" },
    { "codigo": "HID", "nombre": "Hidalgo" },
    { "codigo": "JAL", "nombre": "Jalisco" },
    { "codigo": "MIC", "nombre": "Michoacán" },
    { "codigo": "MOR", "nombre": "Morelos" },
    { "codigo": "NAY", "nombre": "Nayarit" },
    { "codigo": "NLE", "nombre": "Nuevo León" },
    { "codigo": "OAX", "nombre": "Oaxaca" },
    { "codigo": "PUE", "nombre": "Puebla" },
    { "codigo": "QUE", "nombre": "Querétaro" },
    { "codigo": "ROO", "nombre": "Quintana Roo" },
    { "codigo": "SLP", "nombre": "San Luis Potosí" },
    { "codigo": "SIN", "nombre": "Sinaloa" },
    { "codigo": "SON", "nombre": "Sonora" },
    { "codigo": "TAB", "nombre": "Tabasco" },
    { "codigo": "TAM", "nombre": "Tamaulipas" },
    { "codigo": "TLA", "nombre": "Tlaxcala" },
    { "codigo": "VER", "nombre": "Veracruz" },
    { "codigo": "YUC", "nombre": "Yucatán" },
    { "codigo": "ZAC", "nombre": "Zacatecas" }
  ],

  regimenesFiscales: [
    { "codigo": "601", "descripcion": "General de Ley Personas Morales" },
    { "codigo": "603", "descripcion": "Personas Morales con Fines no Lucrativos" },
    { "codigo": "605", "descripcion": "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
    { "codigo": "606", "descripcion": "Arrendamiento" },
    { "codigo": "607", "descripcion": "Régimen de Enajenación o Adquisición de Bienes" },
    { "codigo": "608", "descripcion": "Demás ingresos" },
    { "codigo": "610", "descripcion": "Residentes en el Extranjero sin Establecimiento Permanente en México" },
    { "codigo": "611", "descripcion": "Ingresos por Dividendos (socios y accionistas)" },
    { "codigo": "612", "descripcion": "Personas Físicas con Actividades Empresariales y Profesionales" },
    { "codigo": "614", "descripcion": "Ingresos por intereses" },
    { "codigo": "615", "descripcion": "Régimen de los ingresos por obtención de premios" },
    { "codigo": "616", "descripcion": "Sin obligaciones fiscales" },
    { "codigo": "620", "descripcion": "Sociedades Cooperativas de Producción que optan por diferir sus ingresos" },
    { "codigo": "621", "descripcion": "Incorporación Fiscal" },
    { "codigo": "622", "descripcion": "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
    { "codigo": "623", "descripcion": "Opcional para Grupos de Sociedades" },
    { "codigo": "624", "descripcion": "Coordinados" },
    { "codigo": "625", "descripcion": "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
    { "codigo": "626", "descripcion": "Régimen Simplificado de Confianza" }
  ],

  usosCfdi: [
    { "codigo": "G01", "descripcion": "Adquisición de mercancías" },
    { "codigo": "G02", "descripcion": "Devoluciones, descuentos o bonificaciones" },
    { "codigo": "G03", "descripcion": "Gastos en general" },
    { "codigo": "I01", "descripcion": "Construcciones" },
    { "codigo": "I02", "descripcion": "Mobiliario y equipo de oficina por inversiones" },
    { "codigo": "I03", "descripcion": "Equipo de transporte" },
    { "codigo": "I04", "descripcion": "Equipo de cómputo y accesorios" },
    { "codigo": "I05", "descripcion": "Dados, troqueles, moldes, matrices y herramental" },
    { "codigo": "I06", "descripcion": "Comunicaciones telefónicas" },
    { "codigo": "I07", "descripcion": "Comunicaciones satelitales" },
    { "codigo": "I08", "descripcion": "Otra maquinaria y equipo" },
    { "codigo": "D01", "descripcion": "Honorarios médicos, dentales y gastos hospitalarios" },
    { "codigo": "D02", "descripcion": "Gastos médicos por incapacidad o discapacidad" },
    { "codigo": "D03", "descripcion": "Gastos funerales" },
    { "codigo": "D04", "descripcion": "Donativos" },
    { "codigo": "D05", "descripcion": "Intereses reales efectivamente pagados por créditos hipotecarios" },
    { "codigo": "D06", "descripcion": "Aportaciones voluntarias al SAR" },
    { "codigo": "D07", "descripcion": "Primas por seguros de gastos médicos" },
    { "codigo": "D08", "descripcion": "Gastos de transportación escolar obligatoria" },
    { "codigo": "D09", "descripcion": "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones" },
    { "codigo": "D10", "descripcion": "Pagos por servicios educativos (colegiaturas)" },
    { "codigo": "S01", "descripcion": "Sin efectos fiscales" },
    { "codigo": "CP01", "descripcion": "Pagos" },
    { "codigo": "CN01", "descripcion": "Nómina" }
  ],

  formasPago: [
    { "codigo": "01", "descripcion": "Efectivo" },
    { "codigo": "02", "descripcion": "Cheque nominativo" },
    { "codigo": "03", "descripcion": "Transferencia electrónica de fondos" },
    { "codigo": "04", "descripcion": "Tarjeta de crédito" },
    { "codigo": "05", "descripcion": "Monedero electrónico" },
    { "codigo": "06", "descripcion": "Dinero electrónico" },
    { "codigo": "08", "descripcion": "Vales de despensa" },
    { "codigo": "12", "descripcion": "Dación en pago" },
    { "codigo": "13", "descripcion": "Pago por subrogación" },
    { "codigo": "14", "descripcion": "Pago por consignación" },
    { "codigo": "15", "descripcion": "Condonación" },
    { "codigo": "17", "descripcion": "Compensación" },
    { "codigo": "23", "descripcion": "Novación" },
    { "codigo": "24", "descripcion": "Confusión" },
    { "codigo": "25", "descripcion": "Remisión de deuda" },
    { "codigo": "26", "descripcion": "Prescripción o caducidad" },
    { "codigo": "27", "descripcion": "A satisfacción del acreedor" },
    { "codigo": "28", "descripcion": "Tarjeta de débito" },
    { "codigo": "29", "descripcion": "Tarjeta de servicios" },
    { "codigo": "30", "descripcion": "Aplicación de anticipos" },
    { "codigo": "31", "descripcion": "Intermediario pagos" },
    { "codigo": "99", "descripcion": "Por definir" }
  ],

  metodosPago: [
    { "codigo": "PUE", "descripcion": "Pago en una sola exhibición" },
    { "codigo": "PPD", "descripcion": "Pago en parcialidades o diferido" }
  ],

  // Nuevos catálogos que deberían estar en BD
  modulos: [
    { "id": "dashboard", "nombre": "Dashboard", "icono": "fas fa-tachometer-alt", "activo": true },
    { "id": "empleados", "nombre": "Empleados", "icono": "fas fa-users", "activo": true },
    { "id": "clientes", "nombre": "Clientes", "icono": "fas fa-user-friends", "activo": true },
    { "id": "proveedores", "nombre": "Proveedores", "icono": "fas fa-truck", "activo": true },
    { "id": "inventarios", "nombre": "Inventarios", "icono": "fas fa-boxes", "activo": true },
    { "id": "equipos", "nombre": "Equipos", "icono": "fas fa-tools", "activo": true },
    { "id": "reportes", "nombre": "Reportes", "icono": "fas fa-chart-bar", "activo": true },
    { "id": "puntoventa", "nombre": "Punto de Venta", "icono": "fas fa-cash-register", "activo": true },
    { "id": "configuracion", "nombre": "Configuración", "icono": "fas fa-cogs", "activo": true }
  ]
};

module.exports = catalogosCompletos;