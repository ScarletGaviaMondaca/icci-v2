import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanService } from '../../servicios/plan.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-vista-plan',
  imports: [CommonModule],
  templateUrl: './vista-plan.html',
  styleUrl: './vista-plan.css',
})
export class VistaPlan implements OnInit {
   planes: any[] = [];
  plan: any = null;
  private planService = inject(PlanService)
  private cdr = inject(ChangeDetectorRef);
  mostrarPlanes: boolean = false;
  malla: any[] = [];
  mallaView: any[] = [];
  archivoCSV!: File;
  pageSize = 15;
  page = 1;
  totalPages = 1;
 contexto: string = '';
  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public auth: AuthService
  ) {}  

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.contexto = data['contexto'] ?? 'carrera';
    });
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam && !isNaN(Number(idParam))) {
        const id = Number(idParam);
        if (id > 0) { // Si id es mayor a 0, es válido para tus planes reales
          this.cargarPlan(id);
          return;
        }
      }
      this.plan = null;
    });
  }

  private parseNro(nro: any): number[] {
    const s = String(nro ?? '').trim();
    if (!s) return [Number.MAX_SAFE_INTEGER];
    return s.split('.').map(p => {
      const n = Number(p);
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    });
  }
  
  private compareNro(a: any, b: any): number {
    const A = this.parseNro(a);
    const B = this.parseNro(b);
    const len = Math.max(A.length, B.length);
    for (let i = 0; i < len; i++) {
      const x = A[i] ?? 0;
      const y = B[i] ?? 0;
      if (x !== y) return x - y; // ascendente
    }
    return 0;
  }
  private recalcMallaView() {
    const total = this.malla?.length ?? 0;
    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));

    if (this.page > this.totalPages) this.page = this.totalPages;
    if (this.page < 1) this.page = 1;

    const start = (this.page - 1) * this.pageSize;
    this.mallaView = (this.malla ?? []).slice(start, start + this.pageSize);

    this.cdr.detectChanges();
  }

  cargarPlan(id: number) {

    this.planService.getPlan(id).subscribe({
      next: (data) => {
        if (!data) {
          console.error("Plan devuelto es null");
          this.plan = null;
          this.malla = [];
          return;
        }
        this.plan = data; 
        this.cargarMalla(id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener plan', err);
        this.plan = null;
        this.malla = [];
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

  eliminarPlan(id: number) {
    if (!confirm('¿Seguro que quieres eliminar este plan?')) return;

    this.planService.eliminarPlan(id).subscribe({
      next: () => {
        console.log('Eliminado');
        this.cargarListaPlanes(); // 🔄 refresca lista
      },
      error: (err) => {
        console.error('Error al eliminar', err);
      }
    });
  }

  editarPlan(plan: any) {
    const nuevoAnio = prompt('Nuevo año:', plan.anio);

    if (!nuevoAnio) return;

    this.planService.actualizarPlan(plan.id, { anio: nuevoAnio }).subscribe({
      next: () => {
        console.log('Actualizado');
        this.cargarListaPlanes();
      },
      error: (err) => {
        console.error('Error al actualizar', err);
      }
    });
  }
  togglePlanes() {
    this.mostrarPlanes = !this.mostrarPlanes;
    if (this.mostrarPlanes && this.planes.length === 0) {
      this.cargarListaPlanes();
    }
  }
  irEditar(id: number) {
    this.router.navigate([`/jefe/${this.contexto}/editar-plan`, id]);
  }

  irMalla(id: number) {
    this.router.navigate([`/jefe/${this.contexto}/malla`, id]);
  }
  irAlumnos(planID: number) {
    this.router.navigate([`/jefe/${this.contexto}/alumnos-asociados`, this.plan.id]);
  }
  irAdminPlanes() {
    this.router.navigate(['/admin-plan']);
  }
 //lista malla 
 onFileSelected(event: any) {
    this.archivoCSV = event.target.files[0];
  }
  subirCSV() {
    if (!this.archivoCSV) {
      alert('Selecciona un archivo CSV primero.');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.archivoCSV);
    formData.append('plan_id', String(this.plan.id));
    this.planService.subirMallaCSV(formData).subscribe({
      next: (res) => {   
        console.log('CSV subido:', res);
        this.cargarMalla(this.plan.id);
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al subir CSV', err);
        alert('Error al subir el archivo.');
      }
    });
  }

 cargarMalla(id: number) {
    this.planService.getMalla(id).subscribe({
      next: (data)   => {
      this.malla = data || [];
      this.malla.sort((r1, r2) => this.compareNro(r1.nro, r2.nro));
      this.page = 1; // reset paginación al cargar nueva malla
      this.recalcMallaView();
      this.cdr.detectChanges();
    },
    error: (err) => { 
      console.error('Error al cargar malla', err);
      this.malla = [];
      this.page = 1;
      this.recalcMallaView();
    }
    });
  }
  // para la vista de la tabla 

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.recalcMallaView();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.recalcMallaView();
    }
  }
  obtenerLineas(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split('\n')
    .map(linea => linea.trim().replace(/^[-*]\s*/, '')) // elimina - o * al inicio
    .filter(linea => linea.length > 0);
}

}



