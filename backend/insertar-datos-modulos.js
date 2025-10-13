/**
 * Script para insertar datos de ejemplo en empleados_modulos
 */
const { query } = require('./config/database');

async function insertarDatosModulosEmpleados() {
    console.log('📝 Insertando datos de ejemplo en empleados_modulos...\n');
    
    try {
        // Primero limpiar datos existentes
        await query('DELETE FROM empleados_modulos');
        console.log('🧹 Datos anteriores eliminados');
        
        // Obtener empleados existentes
        const empleados = await query('SELECT id, nombre FROM empleados ORDER BY id');
        console.log(`👥 ${empleados.rows.length} empleados encontrados`);
        
        // Obtener módulos existentes
        const modulos = await query('SELECT clave FROM modulos WHERE activo = true ORDER BY orden');
        console.log(`📦 ${modulos.rows.length} módulos encontrados`);
        
        if (modulos.rows.length === 0) {
            console.log('❌ No hay módulos disponibles. Ejecuta primero la inserción de módulos.');
            return;
        }
        
        // Asignar módulos a empleados
        for (const empleado of empleados.rows) {
            let modulosAsignados = [];
            
            // Lógica de asignación según el empleado
            if (empleado.id === 1) {
                // Administrador - todos los módulos
                modulosAsignados = modulos.rows.map(m => m.clave);
            } else if (empleado.id === 6) {
                // Erick prensado - solo empleados (como se ve en la imagen)
                modulosAsignados = ['empleados'];
            } else if (empleado.id === 9) {
                // Ana López Silva - clientes y reportes
                modulosAsignados = ['clientes', 'reportes'];
            } else {
                // Otros empleados - módulos básicos
                modulosAsignados = ['dashboard', 'clientes'];
            }
            
            console.log(`\n👤 ${empleado.nombre} (ID: ${empleado.id}):`);
            
            // Insertar todos los módulos para este empleado
            for (const modulo of modulos.rows) {
                const tieneAcceso = modulosAsignados.includes(modulo.clave);
                
                await query(`
                    INSERT INTO empleados_modulos (empleado_id, modulo, acceso)
                    VALUES ($1, $2, $3)
                `, [empleado.id, modulo.clave, tieneAcceso]);
                
                console.log(`   ${tieneAcceso ? '✅' : '❌'} ${modulo.clave}`);
            }
        }
        
        console.log('\n🎉 Datos de módulos insertados exitosamente!');
        
        // Verificar los datos insertados
        console.log('\n📊 Resumen final:');
        const resumen = await query(`
            SELECT e.nombre, em.modulo, em.acceso 
            FROM empleados_modulos em
            JOIN empleados e ON em.empleado_id = e.id
            WHERE em.acceso = true
            ORDER BY e.id, em.modulo
        `);
        
        const agrupado = {};
        resumen.rows.forEach(row => {
            if (!agrupado[row.nombre]) {
                agrupado[row.nombre] = [];
            }
            agrupado[row.nombre].push(row.modulo);
        });
        
        Object.keys(agrupado).forEach(nombre => {
            console.log(`${nombre}: ${agrupado[nombre].join(', ')}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

insertarDatosModulosEmpleados();