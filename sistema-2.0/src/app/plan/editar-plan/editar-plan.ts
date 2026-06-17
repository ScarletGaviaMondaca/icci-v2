import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanService } from '../../servicios/plan.service';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { Location } from '@angular/common';

@Component({
  selector: 'app-editar-plan',
  imports: [CommonModule, FormsModule, AngularEditorModule],
  templateUrl: './editar-plan.html',
  styleUrl: './editar-plan.css',
})
export class EditarPlan implements OnInit {
  plan: any = {};
  planOriginal: any = {};
  contexto: string = 'carrera';
constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planService: PlanService, 
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit() {
    this.contexto = this.route.snapshot.data['contexto'] ?? 'carrera';
    const id = this.route.snapshot.params['id'];
    this.planService.getPlan(id).subscribe((data: any) => {
      this.plan = data;
      this.planOriginal = JSON.parse(JSON.stringify(data)); // Clonamos para comparar después
      this.cdr.detectChanges();
    });
  }
  
  guardar() {
  this.planService.actualizarPlan(this.plan.id, this.plan).subscribe({
    next: () => {
      alert("✅ Guardado correctamente");

      // 🔥 actualizar copia
      this.planOriginal = JSON.parse(JSON.stringify(this.plan));

      this.router.navigate(['/jefe/' + this.contexto]);
    }
  });
}

  volver() {
    if (this.hayCambios()) {
      const salir = confirm("⚠️ Tienes cambios sin guardar. ¿Quieres salir?");
      if (!salir) return;
    }
    this.location.back();
  }

  hayCambios(): boolean {
    return JSON.stringify(this.plan) !== JSON.stringify(this.planOriginal);
  }
  
 @HostListener('window:beforeunload', ['$event'])
  confirmarSalida($event: any) {
    if (this.hayCambios()) {
      $event.returnValue = true;
    }
  }

  obtenerLineas(texto: string | null | undefined): string[] {
  // Divide por líneas, elimina vacíos y asteriscos/puntos al inicio si quieres
  if (!texto) return [];
  return texto
    .split('\n')
    .map(linea => linea.trim().replace(/^[-*]\s*/, '')) // elimina - o * al inicio
    .filter(linea => linea.length > 0);
}

}
