import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';
import { SeguimientoService } from '../../servicios/seguimiento.service';

@Component({
  selector: 'app-evaluaciones-empresa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluaciones.html',
  styleUrl: './evaluaciones.css'
})
export class EvaluacionesEmpresa implements OnInit {
  alumnos: any[] = [];
  cargando = false;
  error = '';

  constructor(
    private auth: AuthService,
    private seg: SeguimientoService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    const usuarioId = this.auth.getUsuario()?.id;
    if (!usuarioId) return;
    this.cargando = true;
    this.seg.getEvaluacionesEmpleador(usuarioId).subscribe({
      next: (data) => {
        this.alumnos = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar las evaluaciones';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  get pendientes(): any[] {
    return this.alumnos.filter(a => a.eval_empresa_estado === 1);
  }

  get evaluados(): any[] {
    return this.alumnos.filter(a => a.eval_empresa_estado === 2);
  }

  irEvaluar(item: any) {
    this.router.navigate(['/evaluar-empresa'], { state: { notif: item } });
  }
}
