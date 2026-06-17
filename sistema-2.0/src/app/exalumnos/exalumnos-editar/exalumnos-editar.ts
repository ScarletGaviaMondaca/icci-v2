import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExalumnosService } from '../../servicios/exalumnos.service';

@Component({
  selector: 'app-exalumnos-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './exalumnos-editar.html',
  styleUrl: './exalumnos-editar.css'
})
export class ExalumnosEditar implements OnInit {

  form!: FormGroup;
  alumno: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: ExalumnosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.service.getExalumno(+id).subscribe((data: any) => {
        this.alumno = {
          ...data,
          emails:    (data.emails    || []).map((e: any) => typeof e === 'string' ? e : (e.email    ?? '')),
          telefonos: (data.telefonos || []).map((t: any) => typeof t === 'string' ? t : (t.telefono ?? '')),
          trabajos:  (data.trabajos  || []).map((t: any) => ({
            empresa:           t.empresa           ?? '',
            cargo:             t.cargo             ?? '',
            sueldo_aproximado: t.sueldo_aproximado ?? 0,
            actual:            t.actual            ?? false,
          })),
        };
        this.cdr.detectChanges();
        this.crearFormulario();
      });
    }
  }

  crearFormulario() {
    this.form = this.fb.group({
      nombres: [this.alumno.nombres],
      paterno: [this.alumno.paterno],
      materno: [this.alumno.materno],
      anio_ingreso: [this.alumno.anio_ingreso],
      anio_titulacion: [this.alumno.anio_titulacion],
      nombre_carrera: [this.alumno.nombre_carrera],
      facultad: [this.alumno.facultad],
      nombre_titulo: [this.alumno.nombre_titulo],

      emails: this.fb.array(this.alumno.emails.map((e: string) => this.fb.control(e))),
      telefonos: this.fb.array(this.alumno.telefonos.map((t: string) => this.fb.control(t))),
      trabajos: this.fb.array(this.alumno.trabajos.map((t: any) => this.crearTrabajo(t)))
    });
  }

  crearTrabajo(t: any): FormGroup {
    return this.fb.group({
      empresa: [t.empresa],
      cargo: [t.cargo],
      sueldo_aproximado: [t.sueldo_aproximado],
      actual: [t.actual]
    });
  }
  
  get emails() { return this.form.get('emails') as FormArray; }
  get telefonos() { return this.form.get('telefonos') as FormArray; }
  get trabajos() { return this.form.get('trabajos') as FormArray; }
  // EMAILS
  agregarEmail() {
    this.alumno.emails.push('');
  }

  eliminarEmail(i: number) {
    this.alumno.emails.splice(i, 1);
  }

  // TELÉFONOS
  agregarTelefono() {
    this.alumno.telefonos.push('');
  }

  eliminarTelefono(i: number) {
    this.alumno.telefonos.splice(i, 1);
  }

  // TRABAJOS
  agregarTrabajo() {
    this.alumno.trabajos.push({
      empresa: '',
      cargo: '',
      sueldo_aproximado: 0,
      actual: false
    });
  }
  onSueldoChange(valor: string, i: number) {
    // quitar todo lo que no sea número
    let limpio = valor.replace(/\D/g, '');

    // formatear con puntos
    let formateado = limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // guardar formateado en el input
    this.alumno.trabajos[i].sueldo_aproximado = formateado;
  }

  eliminarTrabajo(i: number) {
    this.alumno.trabajos.splice(i, 1);
  }

  guardar() {
    const data = {
      ...this.alumno,
      trabajos: this.alumno.trabajos.map((t: any) => ({
        ...t,
        sueldo_aproximado: Number(
          (t.sueldo_aproximado || '').toString().replace(/\./g, '')
        )
      }))
    };

    this.service.actualizarExalumno(data)
      .subscribe(() => {
        alert('Guardado correctamente');
        this.volver();
      });
  }
  volver() {  
    this.router.navigate(['/exalumnos/perfil', this.alumno.id]);
  }
}