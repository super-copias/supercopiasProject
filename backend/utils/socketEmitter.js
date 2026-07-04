/**
 * socketEmitter — Singleton que almacena la instancia de Socket.io.
 * Permite que los controladores emitan eventos sin importar directamente
 * el servidor HTTP (evita dependencias circulares).
 *
 * Uso en index.js:
 *   const { setIo } = require('./utils/socketEmitter');
 *   setIo(io);
 *
 * Uso en controladores:
 *   const { getIo } = require('../utils/socketEmitter');
 *   getIo()?.emit('equipo:contador:updated', payload);
 */

let _io = null;

function setIo(ioInstance) {
  _io = ioInstance;
}

/**
 * Retorna la instancia de Socket.io, o null si aún no fue inicializada.
 * El uso de null-safe ?.emit en los controladores garantiza que no
 * explote si el servidor arranca sin WebSockets (tests, CI, etc.).
 */
function getIo() {
  return _io;
}

module.exports = { setIo, getIo };
