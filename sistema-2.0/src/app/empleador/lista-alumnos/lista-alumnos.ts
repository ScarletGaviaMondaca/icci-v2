import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth.service';
import { SeguimientoService } from '../../servicios/seguimiento.service';

@Component({
  selector: 'app-lista-alumnos-empresa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-alumnos.html',
  styleUrl: './lista-alumnos.css'
})
export class ListaAlumnosEmpresa implements OnInit {
  alumnos: any[] = [];
  cargando = false;
  error = '';

  resultadoLabels: Record<number, string> = {
    0: 'En curso',
    1: 'En curso',
    2: 'Aprobada',
    3: 'Rechazada',
  };
  resultadoClases: Record<number, string> = {
    0: 'badge bg-secondary',
    1: 'badge bg-info text-dark',
    2: 'badge bg-success',
    3: 'badge bg-danger',
  };

  constructor(
    private auth: AuthService,
    private seg: SeguimientoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const usuarioId = this.auth.getUsuario()?.id;
    if (!usuarioId) return;
    this.cargando = true;
    this.seg.getAlumnosEmpresa(usuarioId).subscribe({
      next: (data) => {
        this.alumnos = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar el listado de alumnos';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }
}
