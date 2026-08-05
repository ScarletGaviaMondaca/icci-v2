import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rutFormato',
  standalone: true,
})
export class RutFormatoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    const limpio = value.toString().trim().replace(/[^0-9kK]/g, '');
    if (limpio.length < 2) return value.toString();

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1).toUpperCase();
    const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${cuerpoConPuntos}-${dv}`;
  }
}
