const { initializeDatabase, query } = require('../config/database');

(async () => {
  await initializeDatabase();
  try {
    const r = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='inventarios_movimientos' ORDER BY ordinal_position"
    );
    console.log('Columnas:', r.rows.map(c => c.column_name).join(', '));
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
})();
