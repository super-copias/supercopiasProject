import { Pipe, PipeTransform } from '@angular/core';

/**
 * Convierte una hora en formato 24h ("HH:MM" o "HH:MM:SS") a 12h ("6:40 AM").
 * Devuelve el valor original si no puede parsearlo.
 *
 * Uso: {{ turno.hora_entrada | hora12 }}
 */
@Pipe({ name: 'hora12' })
export class Hora12Pipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const m = /^(\d{1,2}):(\d{2})/.exec(value.toString().trim());
    if (!m) return value.toString();

    const h = Number(m[1]);
    const min = m[2];
    if (isNaN(h) || h < 0 || h > 23) return value.toString();

    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${period}`;
  }
}
