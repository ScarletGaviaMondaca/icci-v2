import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanService } from '../../servicios/plan.service';
 
@Component({
  selector: 'app-crear-plan',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-plan.html',
  styleUrl: './crear-plan.css'
})
export class CrearPlan  implements OnInit {
  planForm: FormGroup;
  enviando = false;
  exito = false;
  errorMsg = '';
  contexto: string = 'carrera';
 
  constructor(
    private fb: FormBuilder,
    private planService: PlanService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.planForm = this.fb.group({
      titulo:               ['', [Validators.required, Validators.maxLength(150)]],
      anio:                 ['', [Validators.required, Validators.min(2000), Validators.max(2100)]],
      version:              ['', [Validators.required, Validators.maxLength(20)]],
      duracion:             ['', [Validators.required, Validators.min(1)]],
      fecha_oficializacion: [''],
      fecha_inicio:         ['', Validators.required],
      fecha_cierre:         [''],
      enfoque:              [''],
      perfil_egreso:        [''],
      proposito_formativo:  ['']
    });
  }
    
  ngOnInit(): void {
      this.route.data.subscribe(data => {
      this.contexto = data['contexto'] ?? 'carrera';
    });
  }

  get f() { return this.planForm.controls; }
  onSubmit(): void {
    if (this.planForm.invalid) { this.planForm.markAllAsTouched(); return; }
    this.enviando = true;

    this.planService.crearPlan(this.planForm.value).subscribe({
      next: (res) => {
        this.enviando = false;
        this.exito = true;
        const nuevoId = res?.id;
        setTimeout(() => {
          this.router.navigate([`/jefe/${this.contexto}`, nuevoId ?? '']);
        }, 1800);
      },
      error: (err) => {
        this.enviando = false;
        this.errorMsg = err?.error?.message || 'Error al crear el plan.';
      }
    });
  }

  cancelar(): void {
    this.router.navigate([`/jefe/${this.contexto}`]);
  }
}