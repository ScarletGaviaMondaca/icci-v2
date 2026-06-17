import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { PlanService } from '../../../servicios/plan.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carrera',
  imports: [ CommonModule, RouterLink, RouterOutlet],
  templateUrl: './carrera.html',
  styleUrls: ['./carrera.css'],
})
export class Carrera implements OnInit {
  planes: any[] = [];
  plan: any = null;
  private planService = inject(PlanService)
  private cdr = inject(ChangeDetectorRef);
  mostrarPlanes: boolean = false;

  constructor(
    private route: ActivatedRoute
  ) {}  

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.planService.getPlan(Number(id)).subscribe({
      next: (data) => {
        this.plan = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  cargarPlan(id: number) {

    this.planService.getPlan(id).subscribe({
      next: (data) => {
        if (!data) {
          console.error("Plan devuelto es null");
          this.plan = null;
          return;
        }
        this.plan = data;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al obtener plan', err);
        this.plan = null;
      }
    });
  }

  cargarListaPlanes() {
  this.planService.listarPlanes().subscribe({
    next: (data) => {
      this.planes = data || [];
      if (this.planes.length > 0) {
        this.cargarPlan(this.planes[0].id); 
      }
    },
    error: (err) => {
      console.error('Error al listar planes', err);
      this.planes = [];
    }
  });
}
  togglePlanes() {
    this.mostrarPlanes = !this.mostrarPlanes;
    if (this.mostrarPlanes && this.planes.length === 0) {
      this.cargarListaPlanes();
    }
  }

 
}
