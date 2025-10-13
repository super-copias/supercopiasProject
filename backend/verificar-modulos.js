/**
 * Script para verificar y mostrar datos de empleados_modulos
 */
const { query } = require('./config/database');

async function verificarModulosEmpleados() {
    console.log('🔍 Verificando datos de empleados_modulos...\n');
    
    try {
        // Verificar todos los registros de empleados_modulos
        console.log('1️⃣ Todos los registros en empleados_modulos:');
        const todosModulos = await query('SELECT * FROM empleados_modulos ORDER BY empleado_id, modulo');
        
        if (todosModulos.rows.length === 0) {
            console.log('❌ No hay registros en empleados_modulos');
        } else {
            console.log(`✅ ${todosModulos.rows.length} registros encontrados:`);
            todosModulos.rows.forEach(m => {
                console.log(`   Empleado ${m.empleado_id} -> ${m.modulo}: ${m.acceso ? 'SÍ' : 'NO'}`);
            });
        }
        
        // Verificar empleados específicos
        console.log('\n2️⃣ Módulos por empleado específico:');
        const empleados = await query('SELECT id, nombre FROM empleados ORDER BY id');
        
        for (const emp of empleados.rows) {
            const modulos = await query(
                'SELECT modulo, acceso FROM empleados_modulos WHERE empleado_id = $1',
                [emp.id]
            );
            
            console.log(`\n👤 ${emp.nombre} (ID: ${emp.id}):`);
            if (modulos.rows.length === 0) {
                console.log('   ❌ Sin módulos asignados');
            } else {
                modulos.rows.forEach(m => {
                    console.log(`   ${m.acceso ? '✅' : '❌'} ${m.modulo}`);
                });
            }
        }
        
        // Verificar si existe la tabla y su estructura
        console.log('\n3️⃣ Estructura de la tabla empleados_modulos:');
        const estructura = await query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'empleados_modulos'
            ORDER BY ordinal_position
        `);
        
        estructura.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

verificarModulosEmpleados();