import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlumnoService } from '../../../../servicios/alumno.service';

@Component({
  selector: 'app-crear-alumno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-alumno.html',
  styleUrl: './crear-alumno.css'
})
export class CrearAlumno {
  form: FormGroup;
  enviando = false;
  exito = false;
  errorMsg = '';

  readonly sexoOpciones = ['Femenino', 'Masculino', 'Otro'];

  readonly etnias = [
    'Ninguna', 'Mapuche', 'Aymara', 'Rapa Nui', 'Atacameño (Likan Antai)',
    'Quechua', 'Colla', 'Diaguita', 'Kawésqar', 'Yagán', 'Chango', 'Otra'
  ];

  readonly nacionalidades = [
    'Chile', 'Argentina', 'Bolivia', 'Perú', 'Colombia', 'Venezuela',
    'Brasil', 'Ecuador', 'Paraguay', 'Uruguay', 'Cuba', 'México',
    'Estados Unidos', 'Canadá', 'España', 'Italia', 'Francia',
    'Alemania', 'Portugal', 'China', 'Japón', 'Corea del Sur', 'Haití',
    'República Dominicana', 'Panamá', 'Costa Rica', 'Honduras', 'Guatemala',
    'El Salvador', 'Nicaragua', 'Otra'
  ];

  readonly sistemasIngreso = [
    'PSU', 'PDT', 'PAES', 'Vía especial', 'Titulado', 'Traslado', 'Otro'
  ];
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private alumnoService: AlumnoService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      // Identidad
      rut:                  ['', [Validators.required, Validators.maxLength(15)]],
      nombres:              ['', [Validators.required, Validators.maxLength(50)]],
      apellido1:            ['', [Validators.required, Validators.maxLength(50)]],
      apellido2:            ['', Validators.maxLength(50)],
      sexo:                 [''],
      fecha_nacimiento:     [''],
      nacionalidad:         [''],
      etnia:                [''],
      // Contacto
      direccion:            [''],
      telefono:             ['', Validators.maxLength(20)],
      telefono_emergencia:  ['', Validators.maxLength(20)],
      correo_personal:      ['', [Validators.email, Validators.maxLength(100)]],
      correo_institucional: ['', [Validators.email, Validators.maxLength(100)]],
      // Académico
      plan_texto:           ['', Validators.maxLength(50)],
      colegio:              ['', Validators.maxLength(255)],
      anio_ingreso:         [''],
      fecha_matricula:      [''],
      sistema_ingreso:      [''],
      puntaje_ingreso:      ['', [Validators.min(0), Validators.max(1000)]],
      nem:                  ['', [Validators.min(0), Validators.max(700)]],
      gratuidad:            [''],
      avance:               ['', [Validators.required, Validators.min(0), Validators.max(100)]],
    });
  }

  get f() { return this.form.controls; }

  seleccionarSexo(valor: string): void {
    this.form.patchValue({ sexo: valor });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando = true;
    this.errorMsg = '';

    this.alumnoService.crearAlumno(this.form.value).subscribe({
      next: () => {
        this.enviando = false;
        this.exito = true;
        setTimeout(() => this.router.navigate(['/lista-alumnos']), 1800);
      },
      error: (err) => {
        this.enviando = false;
        this.errorMsg = err?.error?.message || err?.error?.error || 'Error al crear el alumno.';
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/lista-alumnos']);
  }
}