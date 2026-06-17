import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlumnoService } from '../../../../servicios/alumno.service';

@Component({
  selector: 'app-agregar-alumno-especial',
  imports: [CommonModule, FormsModule],
  templateUrl: './agregar-alumno-especial.html',
  styleUrl: './agregar-alumno-especial.css'
})
export class AgregarAlumnoEspecial {
  alumno = {
    rut: '',
    nombres: '',
    apellido1: '',
    apellido2: '',
    plan_texto: '',
    anio_ingreso: undefined as number | undefined,
    anio_reingreso: undefined as number | undefined,
  };
  guardando = false;
  error: string | null = null;

  constructor(
    private alumnoService: AlumnoService,
    private router: Router
  ) {}

  guardar() {
    if (!this.alumno.rut || !this.alumno.nombres || !this.alumno.apellido1) {
      this.error = '🚫 RUT, nombre y apellido paterno son requeridos.';
      return;
    }
    this.guardando = true;
    this.error = null;

    this.alumnoService.crearAlumnoEspecial(this.alumno).subscribe({
      next: () => {
        this.router.navigate(['/seguimiento/candidatos']);
      },
      error: (err) => {
        this.error = err.error?.error ?? '❌ Error al guardar.';
        this.guardando = false;
      }
    });
  }

  volver() {
    this.router.navigate(['/seguimiento/candidatos']);
  }
}