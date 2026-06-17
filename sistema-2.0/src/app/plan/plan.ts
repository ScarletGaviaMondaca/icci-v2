import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PlanService } from '../servicios/plan.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-plan',
  imports: [RouterModule,  CommonModule],
  templateUrl: './plan.html',
  styleUrls: ['./plan.css'],
})

export class Plan implements OnInit {

  planes: any[] = [];
  cargando = true;
  errorMsg = '';
  // Modal de confirmación de eliminación
  mostrarModal = false;
  planAEliminar: any = null;
  eliminando = false;
 
  constructor(
    private planService: PlanService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}
 
  ngOnInit(): void {
    this.cargarPlanes();
  }
 
  cargarPlanes(): void {
    this.cargando = true;
    this.planService.listarPlanes().subscribe({
      next: (data) => {
        this.planes = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los planes.';
        this.cargando = false;
      }
    });
  }
 
  verPlan(id: number): void {
    this.router.navigate(['/jefe/carrera', id]);
  }
 
  editarPlan(id: number): void {
    this.router.navigate(['/jefe/carrera/editar-plan', id]);
  }
 
  confirmarEliminar(plan: any): void {
    this.planAEliminar = plan;
    this.mostrarModal = true;
  }
 
  cancelarEliminar(): void {
    this.mostrarModal = false;
    this.planAEliminar = null;
  }
 
  eliminarPlan(): void {
    if (!this.planAEliminar) return;
    this.eliminando = true;
    this.planService.eliminarPlan(this.planAEliminar.id).subscribe({
      next: (res) => {
        this.eliminando = false;
        this.mostrarModal = false;
        this.planAEliminar = null;
        this.cargarPlanes();
      },
      error: (err) => {
        this.eliminando = false;
        this.errorMsg = 'Error al eliminar el plan.';
        this.mostrarModal = false;
      }
    });
  }
 
  crearPlan(): void {
    this.router.navigate(['/jefe/carrera/crear-plan']);
  }

}
