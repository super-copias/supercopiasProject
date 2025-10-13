/**
 * Script temporal para insertar módulos directamente en la BD
 */
const { query } = require('./config/database');

async function insertarModulos() {
    console.log('🔧 Insertando módulos del sistema...');
    
    const modulos = [
        { clave: 'dashboard', nombre: 'Dashboard', icono: 'fas fa-tachometer-alt', orden: 1 },
        { clave: 'empleados', nombre: 'Empleados', icono: 'fas fa-users', orden: 2 },
        { clave: 'clientes', nombre: 'Clientes', icono: 'fas fa-user-tie', orden: 3 },
        { clave: 'proveedores', nombre: 'Proveedores', icono: 'fas fa-truck', orden: 4 },
        { clave: 'inventarios', nombre: 'Inventarios', icono: 'fas fa-boxes', orden: 5 },
        { clave: 'punto_venta', nombre: 'Punto de Venta', icono: 'fas fa-cash-register', orden: 6 },
        { clave: 'equipos', nombre: 'Equipos', icono: 'fas fa-desktop', orden: 7 },
        { clave: 'reportes', nombre: 'Reportes', icono: 'fas fa-chart-bar', orden: 8 },
        { clave: 'configuracion', nombre: 'Configuración', icono: 'fas fa-cogs', orden: 9 }
    ];
    
    try {
        for (const modulo of modulos) {
            await query(`
                INSERT INTO modulos (clave, nombre, icono, activo, orden) 
                VALUES ($1, $2, $3, true, $4)
                ON CONFLICT (clave) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    icono = EXCLUDED.icono,
                    activo = EXCLUDED.activo,
                    orden = EXCLUDED.orden
            `, [modulo.clave, modulo.nombre, modulo.icono, modulo.orden]);
            
            console.log(`✅ Módulo "${modulo.nombre}" insertado`);
        }
        
        // Verificar los módulos insertados
        const result = await query('SELECT * FROM modulos ORDER BY orden');
        console.log(`\n📊 Total de módulos: ${result.rows.length}`);
        result.rows.forEach(m => console.log(`   ${m.orden}. ${m.nombre} (${m.clave})`));
        
        console.log('\n🎉 Módulos insertados exitosamente!');
        
    } catch (error) {
        console.error('❌ Error insertando módulos:', error);
    }
}

// Ejecutar la función
insertarModulos();