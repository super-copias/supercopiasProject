const { initializeDatabase, query } = require('../config/database');

(async () => {
  await initializeDatabase();
  try {
    const r = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='inventarios_movimientos' ORDER BY ordinal_position"
    );
    console.log('Columnas inventarios_movimientos:', r.rows.map(c => c.column_name).join(', '));

    // Test filtro por departamento
    const r2 = await query(
      `SELECT COUNT(*) FROM inventarios_movimientos m
       JOIN inventarios i ON i.id=m.inventario_id
       LEFT JOIN inv_departamentos d ON d.id=i.departamento_id
       WHERE i.departamento_id = 3`
    );
    console.log('Registros depto 3:', r2.rows[0].count);

    // Probar con fecha_movimiento
    const r3 = await query(
      `SELECT COUNT(*) FROM inventarios_movimientos m
       JOIN inventarios i ON i.id=m.inventario_id
       ORDER BY m.created_at DESC LIMIT 1`
    );
    console.log('Query con created_at OK, registros:', r3.rows[0].count);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
})();

    const depto = await query("SELECT nombre FROM inv_departamentos WHERE id=3");
    const categoriaNombre = depto.rows[0]?.nombre || 'General';

    const r2 = await query(
      `INSERT INTO inventarios (
        departamento_id, categoria, tipo, es_servicio, nombre, descripcion, codigo_sku, marca, modelo, proveedor_id,
        unidad_medida, existencia_actual, stock_minimo, stock_maximo, ubicacion_fisica,
        costo_compra, precio_venta, costo_promedio, disponible_en_pos, activo, estatus
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true,'activo') RETURNING id`,
      [3, categoriaNombre, 'venta', false, 'TestDiag', null, null, null, null, null,
       'Unidad', 5, 10, 30, null, 5, 7, 5, false]
    );
    console.log('INSERT OK id:', r2.rows[0].id);
    await query('DELETE FROM inventarios WHERE id=$1', [r2.rows[0].id]);
    console.log('Registro de prueba eliminado');
  } catch (e) {
    console.error('ERROR SQL:', e.message);
    if (e.detail) console.error('DETAIL:', e.detail);
    if (e.hint) console.error('HINT:', e.hint);
  }
  process.exit(0);
})();
