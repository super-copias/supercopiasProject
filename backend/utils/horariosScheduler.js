/**
 * Scheduler de Horarios de Acceso - SuperCopias
 *
 * En lugar de hacer polling cada N segundos, calcula los milisegundos exactos
 * hasta cada transición (hora_inicio / hora_fin) y usa setTimeout para disparar
 * exactamente en ese instante. Después de cada disparo se reprograma para
 * la siguiente ocurrencia (24 h después).
 *
 * Cuando se crea, edita o elimina un horario desde la API, se llama a
 * reiniciarScheduler() para que los nuevos tiempos queden registrados
 * sin necesidad de reiniciar el servidor.
 */

const { query } = require('../config/database');

/** Conjunto de timeouts activos para poder cancelarlos todos */
const activeTimeouts = new Set();

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Milisegundos hasta la próxima ocurrencia de "HH:MM[:SS]" en hora local.
 * Si ya pasó hoy, devuelve el tiempo hasta mañana a esa hora.
 */
function msHasta(timeStr) {
  const [h, m] = timeStr.toString().split(':').map(Number);
  const ahora = new Date();
  const objetivo = new Date(ahora);
  objetivo.setHours(h, m, 0, 0);
  let diff = objetivo.getTime() - ahora.getTime();
  if (diff <= 0) diff += 24 * 60 * 60 * 1000; // siguiente día
  return diff;
}

/**
 * Minutos desde medianoche para la hora actual
 */
function ahoraEnMinutos() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Convierte "HH:MM[:SS]" a minutos desde medianoche
 */
function timeAMinutos(timeStr) {
  const [h, m] = timeStr.toString().split(':').map(Number);
  return h * 60 + m;
}

// ─────────────────────────────────────────────
// Lógica de acceso
// ─────────────────────────────────────────────

/**
 * Consulta los horarios activos, determina si ahora mismo se permite el acceso
 * y activa/desactiva usuarios no-admin según corresponda.
 */
async function aplicarEstadoActual() {
  try {
    const { rows: horarios } = await query(
      'SELECT * FROM horarios_acceso WHERE activo = true'
    );

    if (horarios.length === 0) return; // sin horarios → no tocar nada

    const ahora = ahoraEnMinutos();
    const dentroDeHorario = horarios.some(h => {
      const inicio = timeAMinutos(h.hora_inicio);
      const fin    = timeAMinutos(h.hora_fin);
      return ahora >= inicio && ahora <= fin;
    });

    if (dentroDeHorario) {
      await query(`
        UPDATE usuarios
        SET activo = true, fecha_modificacion = NOW()
        WHERE role != 'admin'
          AND activo = false
          AND empleado_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM empleados e
            WHERE e.id = usuarios.empleado_id AND e.activo = true
          )
      `);
      console.log('[Horarios Scheduler] Dentro de horario → usuarios activados.');
    } else {
      await query(`
        UPDATE usuarios
        SET activo = false, fecha_modificacion = NOW()
        WHERE role != 'admin'
          AND activo = true
      `);
      console.log('[Horarios Scheduler] Fuera de horario → usuarios desactivados.');
    }
  } catch (error) {
    console.error('[Horarios Scheduler] Error al aplicar estado:', error.message);
  }
}

// ─────────────────────────────────────────────
// Programación de transiciones exactas
// ─────────────────────────────────────────────

/**
 * Programa un setTimeout para `timeStr` que, al disparar:
 *  1. Aplica el estado de acceso correspondiente al momento actual.
 *  2. Se reprograma para la misma hora del día siguiente.
 */
function programarTransicion(timeStr, etiqueta) {
  function schedule() {
    const ms = msHasta(timeStr);
    const hhmm = timeStr.toString().slice(0, 5);
    console.log(`[Horarios Scheduler] Próxima transición "${etiqueta}" (${hhmm}) en ${Math.round(ms / 60000)} min.`);

    const t = setTimeout(async () => {
      activeTimeouts.delete(t);
      console.log(`[Horarios Scheduler] Ejecutando transición "${etiqueta}" (${hhmm}).`);
      await aplicarEstadoActual();
      schedule(); // reprogramar para mañana a la misma hora
    }, ms);

    activeTimeouts.add(t);
  }

  schedule();
}

/**
 * Cancela todos los timeouts pendientes
 */
function cancelarTodos() {
  activeTimeouts.forEach(t => clearTimeout(t));
  activeTimeouts.clear();
}

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

/**
 * Inicia el scheduler:
 *  - Aplica el estado correcto inmediatamente.
 *  - Programa un timeout por cada hora_inicio y hora_fin de horarios activos.
 */
async function iniciarScheduler() {
  cancelarTodos();

  try {
    const { rows: horarios } = await query(
      'SELECT * FROM horarios_acceso WHERE activo = true'
    );

    // Aplicar estado actual sin esperar al primer timeout
    await aplicarEstadoActual();

    if (horarios.length === 0) {
      console.log('[Horarios Scheduler] Sin horarios activos. No se programan transiciones.');
      return;
    }

    for (const h of horarios) {
      programarTransicion(h.hora_inicio, `activar · ${h.nombre}`);
      programarTransicion(h.hora_fin,    `desactivar · ${h.nombre}`);
    }

    console.log(`[Horarios Scheduler] ${horarios.length * 2} transición(es) programada(s).`);
  } catch (error) {
    console.error('[Horarios Scheduler] Error al iniciar:', error.message);
  }
}

/**
 * Reinicia el scheduler (llamar cuando se crea/edita/elimina un horario).
 * Cancela todos los timeouts actuales y vuelve a programar desde cero.
 */
async function reiniciarScheduler() {
  console.log('[Horarios Scheduler] Reiniciando...');
  await iniciarScheduler();
}

/**
 * Detiene el scheduler completamente (usado en SIGINT/SIGTERM).
 */
function detenerScheduler() {
  cancelarTodos();
  console.log('[Horarios Scheduler] Detenido.');
}

module.exports = { iniciarScheduler, reiniciarScheduler, detenerScheduler, aplicarEstadoActual };
