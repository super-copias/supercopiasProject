/**
 * Script simple para insertar datos de módulos usando el backend corriendo
 */

console.log('📝 Insertando datos de módulos a través de API...\n');

// Datos de módulos para empleados
const datosEmpleados = {
    1: ['dashboard', 'empleados', 'clientes', 'proveedores', 'inventarios', 'punto_venta', 'equipos', 'reportes', 'configuracion'], // Admin - todos
    6: ['empleados'], // Erick - solo empleados
    7: ['dashboard', 'clientes'], // María - básicos
    8: ['dashboard', 'clientes', 'inventarios'], // Juan - ventas
    9: ['clientes', 'reportes'] // Ana - clientes y reportes
};

async function insertarModulosViaAPI() {
    try {
        // Verificar que el backend esté corriendo
        const response = await fetch('http://localhost:3000/api/catalogos/modulos');
        const modulosData = await response.json();
        
        if (!modulosData.success) {
            console.error('❌ El backend no está respondiendo correctamente');
            return;
        }
        
        const modulos = modulosData.data.map(m => m.clave);
        console.log('📦 Módulos disponibles:', modulos);
        
        console.log('\n📝 SQL para ejecutar manualmente:');
        console.log('-- Limpiar datos anteriores');
        console.log('DELETE FROM empleados_modulos;');
        console.log('\n-- Insertar nuevos datos');
        
        Object.keys(datosEmpleados).forEach(empleadoId => {
            const modulosAsignados = datosEmpleados[empleadoId];
            
            modulos.forEach(modulo => {
                const tieneAcceso = modulosAsignados.includes(modulo);
                console.log(`INSERT INTO empleados_modulos (empleado_id, modulo, acceso) VALUES (${empleadoId}, '${modulo}', ${tieneAcceso});`);
            });
        });
        
        console.log('\n📋 Copia y pega estos comandos SQL en tu herramienta de base de datos.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n📋 Datos para insertar manualmente en la BD:');
        
        // Mostrar datos de respaldo
        Object.keys(datosEmpleados).forEach(empleadoId => {
            console.log(`\nEmpleado ${empleadoId}:`);
            datosEmpleados[empleadoId].forEach(modulo => {
                console.log(`  ✅ ${modulo}`);
            });
        });
    }
}

insertarModulosViaAPI();