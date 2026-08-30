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
 *
 * Además de los timeouts exactos, hay una reconciliación periódica
 * (RECONCILE_MS) como red de seguridad por si un setTimeout no llega a
 * dispararse (reinicio del proceso en el minuto exacto, excepción, drift
 * de reloj, etc.).
 */

const { query } = require('../config/database');

/** Conjunto de timeouts activos para poder cancelarlos todos */
const activeTimeouts = new Set();

/** Intervalo de reconciliación de seguridad (null si no hay horarios activos) */
let reconcileInterval = null;
const RECONCILE_MS = 15 * 60 * 1000; // 15 min

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Devuelve la hora actual en México (America/Mexico_City).
 * El servidor Railway corre en UTC, por lo que no podemos usar getHours().
 */
function getMxNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const get = (type) => parseInt(parts.find(p => p.type === type).value);
  return { h: get('hour') % 24, m: get('minute'), s: get('second') };
}

/**
 * Milisegundos hasta la próxima ocurrencia de "HH:MM[:SS]" en hora de México.
 * Si ya pasó hoy en México, devuelve el tiempo hasta mañana a esa hora.
 */
function msHasta(timeStr) {
  const [targetH, targetM] = timeStr.toString().split(':').map(Number);
  const { h: nowH, m: nowM, s: nowS } = getMxNow();
  const nowTotal    = nowH * 3600 + nowM * 60 + nowS;
  const targetTotal = targetH * 3600 + targetM * 60;
  let diff = targetTotal - nowTotal;
  if (diff <= 0) diff += 24 * 3600;
  return diff * 1000;
}

/**
 * Minutos desde medianoche en hora de México
 */
function ahoraEnMinutos() {
  const { h, m } = getMxNow();
  return h * 60 + m;
}

/**
 * Convierte "HH:MM[:SS]" a minutos desde medianoche
 */
function timeAMinutos(timeStr) {
  const [h, m] = timeStr.toString().split(':').map(Number);
  return h * 60 + m;
}

/**
 * ¿El minuto `ahora` (desde medianoche) cae dentro del rango [inicio, fin]?
 * Soporta rangos que cruzan la medianoche (inicio > fin), p. ej. 22:00–06:00.
 */
function dentroDeRango(ahora, inicio, fin) {
  if (inicio === fin) return true;                          // rango de 24 h
  if (inicio < fin)   return ahora >= inicio && ahora <= fin;
  return ahora >= inicio || ahora <= fin;                   // cruza medianoche
}

// ─────────────────────────────────────────────
// Lógica de acceso
// ─────────────────────────────────────────────

/**
 * Reactiva a los usuarios no-admin cuyo empleado vinculado sigue activo.
 * Un empleado dado de baja manualmente (empleados.activo = false) NO se reactiva:
 * ese es el mecanismo que distingue "desactivado por horario" de "baja manual".
 */
async function activarUsuarios() {
  const { rowCount } = await query(`
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
  return rowCount;
}

/** Desactiva a todos los usuarios no-admin actualmente activos. */
async function desactivarUsuarios() {
  const { rowCount } = await query(`
    UPDATE usuarios
    SET activo = false, fecha_modificacion = NOW()
    WHERE role != 'admin'
      AND activo = true
  `);
  return rowCount;
}

/**
 * Consulta los horarios activos, determina si ahora mismo se permite el acceso
 * y activa/desactiva usuarios no-admin según corresponda.
 */
async function aplicarEstadoActual() {
  try {
    const { rows: horarios } = await query(
      'SELECT * FROM horarios_acceso WHERE activo = true'
    );

    // Sin horarios activos → no hay restricción vigente: se restablece el acceso
    // de todos los empleados activos. (Antes se hacía "return" y los usuarios que
    // el scheduler había desactivado quedaban bloqueados indefinidamente aunque
    // se quitara la restricción de horario.)
    if (horarios.length === 0) {
      const n = await activarUsuarios();
      console.log(`[Horarios Scheduler] Sin horarios activos → acceso restablecido (${n} usuario/s reactivado/s).`);
      return;
    }

    const ahora = ahoraEnMinutos();
    const dentroDeHorario = horarios.some(h =>
      dentroDeRango(ahora, timeAMinutos(h.hora_inicio), timeAMinutos(h.hora_fin))
    );

    if (dentroDeHorario) {
      const n = await activarUsuarios();
      console.log(`[Horarios Scheduler] Dentro de horario → ${n} usuario/s activado/s.`);
    } else {
      const n = await desactivarUsuarios();
      console.log(`[Horarios Scheduler] Fuera de horario → ${n} usuario/s desactivado/s.`);
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
  if (reconcileInterval) {
    clearInterval(reconcileInterval);
    reconcileInterval = null;
  }
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

    // Red de seguridad: reconciliación periódica por si un timeout no dispara.
    reconcileInterval = setInterval(() => {
      aplicarEstadoActual().catch(() => {});
    }, RECONCILE_MS);
    if (reconcileInterval.unref) reconcileInterval.unref(); // no impedir que el proceso termine

    console.log(`[Horarios Scheduler] ${horarios.length * 2} transición(es) programada(s) + reconciliación cada ${RECONCILE_MS / 60000} min.`);
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
