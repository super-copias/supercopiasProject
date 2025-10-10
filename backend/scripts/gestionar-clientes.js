/**
 * Script para gestión de datos de clientes
 * Opciones: limpiar, respaldar, restaurar, listar
 */

const fs = require('fs');
const path = require('path');

// Rutas de archivos
const dbPath = path.join(__dirname, '..', 'db.json');
const backupPath = path.join(__dirname, '..', 'db_backup_clientes.json');

class ClientesManager {
  constructor() {
    this.db = this.loadDatabase();
  }

  loadDatabase() {
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (error) {
      console.error('❌ Error cargando base de datos:', error.message);
      process.exit(1);
    }
  }

  saveDatabase() {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(this.db, null, 2), 'utf8');
      console.log('✅ Base de datos guardada exitosamente');
    } catch (error) {
      console.error('❌ Error guardando base de datos:', error.message);
    }
  }

  // Listar todos los clientes
  listarClientes() {
    const clientes = this.db.clientes || [];
    console.log(`\n📋 Lista de clientes (${clientes.length} total):`);
    console.log('─'.repeat(80));
    
    if (clientes.length === 0) {
      console.log('   No hay clientes registrados');
      return;
    }

    clientes.forEach((cliente, index) => {
      const estado = cliente.activo ? '🟢 ACTIVO' : '🔴 INACTIVO';
      console.log(`${index + 1}. ${cliente.nombre}`);
      console.log(`   ID: ${cliente.id} | RFC: ${cliente.rfc || 'N/A'} | ${estado}`);
      console.log(`   Email: ${cliente.email || 'N/A'} | Tel: ${cliente.telefono || 'N/A'}`);
      console.log('');
    });
  }

  // Respaldar clientes actuales
  respaldarClientes() {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        clientes: this.db.clientes || []
      };
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
      console.log(`✅ Respaldo creado: ${backup.clientes.length} clientes`);
      console.log(`📁 Archivo: ${backupPath}`);
    } catch (error) {
      console.error('❌ Error creando respaldo:', error.message);
    }
  }

  // Restaurar desde respaldo
  restaurarClientes() {
    try {
      if (!fs.existsSync(backupPath)) {
        console.log('❌ No existe archivo de respaldo');
        return;
      }

      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      this.db.clientes = backup.clientes;
      this.saveDatabase();
      console.log(`✅ Clientes restaurados: ${backup.clientes.length} registros`);
      console.log(`📅 Respaldo del: ${backup.timestamp}`);
    } catch (error) {
      console.error('❌ Error restaurando respaldo:', error.message);
    }
  }

  // Limpiar todos los clientes
  limpiarTodos() {
    const cantidadAnterior = this.db.clientes ? this.db.clientes.length : 0;
    this.db.clientes = [];
    this.saveDatabase();
    console.log(`✅ Todos los clientes eliminados (${cantidadAnterior} registros)`);
  }

  // Limpiar y dejar solo ejemplos básicos
  limpiarConEjemplos() {
    const ejemplos = [
      {
        "id": "CLI_EJEMPLO_001",
        "nombre": "Cliente Prueba 1",
        "telefono": "961-000-0001",
        "segundoTelefono": "",
        "email": "prueba1@test.com",
        "direccionEntrega": "Dirección de prueba 1, Tuxtla Gutiérrez, Chiapas",
        "razon": "Cliente Prueba 1 S.A. de C.V.",
        "rfc": "CPU850101001",
        "regimen": "601 - General de Ley Personas Morales",
        "direccion": "Dirección fiscal 1, Tuxtla Gutiérrez, Chiapas",
        "cp": "29000",
        "cfdi": "G01 - Adquisición de mercancías",
        "activo": true,
        "fechaRegistro": new Date().toISOString(),
        "fechaModificacion": null
      },
      {
        "id": "CLI_EJEMPLO_002",
        "nombre": "Cliente Prueba 2",
        "telefono": "961-000-0002",
        "segundoTelefono": "961-000-0003",
        "email": "prueba2@test.com",
        "direccionEntrega": "Dirección de prueba 2, Tuxtla Gutiérrez, Chiapas",
        "razon": "Ana María López",
        "rfc": "LOPA750425002",
        "regimen": "612 - Personas Físicas con Actividades Empresariales",
        "direccion": "Dirección fiscal 2, Tuxtla Gutiérrez, Chiapas",
        "cp": "29030",
        "cfdi": "G03 - Gastos en general",
        "activo": true,
        "fechaRegistro": new Date().toISOString(),
        "fechaModificacion": null
      }
    ];

    const cantidadAnterior = this.db.clientes ? this.db.clientes.length : 0;
    this.db.clientes = ejemplos;
    this.saveDatabase();
    console.log(`✅ Clientes limpiados: ${cantidadAnterior} → ${ejemplos.length} registros`);
    console.log('📋 Clientes de ejemplo creados para testing');
  }

  // Desactivar todos los clientes
  desactivarTodos() {
    const clientes = this.db.clientes || [];
    let desactivados = 0;

    clientes.forEach(cliente => {
      if (cliente.activo) {
        cliente.activo = false;
        cliente.fechaModificacion = new Date().toISOString();
        desactivados++;
      }
    });

    this.saveDatabase();
    console.log(`✅ ${desactivados} clientes desactivados`);
  }

  // Activar todos los clientes
  activarTodos() {
    const clientes = this.db.clientes || [];
    let activados = 0;

    clientes.forEach(cliente => {
      if (!cliente.activo) {
        cliente.activo = true;
        cliente.fechaModificacion = new Date().toISOString();
        activados++;
      }
    });

    this.saveDatabase();
    console.log(`✅ ${activados} clientes activados`);
  }
}

// Ejecutar el script
const manager = new ClientesManager();

// Obtener comando de línea de comandos
const comando = process.argv[2];

console.log('🔧 Gestor de Clientes - SuperCopias');
console.log('═'.repeat(50));

switch (comando) {
  case 'listar':
  case 'list':
    manager.listarClientes();
    break;

  case 'respaldar':
  case 'backup':
    manager.respaldarClientes();
    break;

  case 'restaurar':
  case 'restore':
    manager.restaurarClientes();
    break;

  case 'limpiar':
  case 'clean':
    manager.limpiarTodos();
    break;

  case 'ejemplos':
  case 'examples':
    manager.limpiarConEjemplos();
    break;

  case 'desactivar':
  case 'deactivate':
    manager.desactivarTodos();
    break;

  case 'activar':
  case 'activate':
    manager.activarTodos();
    break;

  default:
    console.log('\n📖 Comandos disponibles:');
    console.log('  node limpiar-clientes.js listar       - Mostrar todos los clientes');
    console.log('  node limpiar-clientes.js respaldar    - Crear respaldo de clientes');
    console.log('  node limpiar-clientes.js restaurar    - Restaurar desde respaldo');
    console.log('  node limpiar-clientes.js limpiar      - Eliminar todos los clientes');
    console.log('  node limpiar-clientes.js ejemplos     - Limpiar y crear 2 clientes de prueba');
    console.log('  node limpiar-clientes.js desactivar   - Desactivar todos los clientes');
    console.log('  node limpiar-clientes.js activar      - Activar todos los clientes');
    console.log('\n💡 Ejemplo: node scripts/limpiar-clientes.js ejemplos');
    break;
}