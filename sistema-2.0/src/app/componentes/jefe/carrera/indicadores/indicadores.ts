import { Component, inject } from '@angular/core';
import { PlanService } from '../../../../servicios/plan.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-indicadores',
  imports: [CommonModule, RouterModule],
  templateUrl: './indicadores.html',
  styleUrl: './indicadores.css',
})
export class Indicadores {

     mostrarPlanes = false;
  planes: any[] = [];

  private planService = inject(PlanService);
  constructor(
    private http: HttpClient,
    private router: Router, 
    private route: ActivatedRoute
    ) {}

  ngOnInit() {
    this.planService.listarPlanes().subscribe({
      next: (data) => {
        this.planes = data;
        console.log(this.planes); // para verificar
      },
      error: (err) => console.error(err)
    });
  }
  
  togglePlanes() {
    this.mostrarPlanes = !this.mostrarPlanes;
  }

}
