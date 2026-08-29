import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-datos-acreditacion',
  imports: [CommonModule],
  templateUrl: './datos-acreditacion.html',
  styleUrl: './datos-acreditacion.css',
})
export class DatosAcreditacion {
  hoy = new Date();
}
