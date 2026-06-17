import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExalumnosService } from '../../servicios/exalumnos.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-exalumnos-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exalumnos-perfil.html',
  styleUrl: './exalumnos-perfil.css'
})
export class ExalumnosPerfil implements OnInit {

  alumno: any = null;
  cargando = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ExalumnosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.service.getExalumno(+id).subscribe({
        next: (data) => {
          this.alumno = {
            ...data,
            emails:    ((data as any).emails    || []).map((e: any) => typeof e === 'string' ? e : (e.email    ?? '')),
            telefonos: ((data as any).telefonos || []).map((t: any) => typeof t === 'string' ? t : (t.telefono ?? '')),
            trabajos:  ((data as any).trabajos  || []),
          };
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar perfil:', err);
          this.cargando = false;
        }
      });
    }
  }

  irEditar() {
    if (this.alumno?.id) {
      this.router.navigate(['/exalumnos/editar', this.alumno.id]);
    }
  }

  volver() {
    this.router.navigate(['/exalumnos/listado']);
  }

}