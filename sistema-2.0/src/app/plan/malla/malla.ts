import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanService } from '../../servicios/plan.service';
import { ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-malla',
  imports: [CommonModule, FormsModule],
  templateUrl: './malla.html',
  styleUrl: './malla.css',
})
export class Malla implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private planService: PlanService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  plan: any = null;
  //malla visual
  malla: any[] = [];
  ramoSeleccionado: any = null;
  mallaPorSemestre: Record<number, any[]> = {};
  semestres: number[] = [];
  //restricciones
  restricciones: any[] = [];
  preReqMap = new Map<string, Set<string>>(); // ramo_codigo -> set(req_codigo)
  depMap = new Map<string, Set<string>>();    // req_codigo -> set(ramo_codigo)
  coReqMap = new Map<string, Set<string>>();
  archivoRestricciones: File | null = null;
  nombreArchivoRestricciones: string = '';
  estadoRestricciones: string = '';
  contexto: string = 'carrera';
  // Nuevas propiedades para el formulario manual
  nuevoRamo: string = '';
  nuevoReq: string = '';
  nuevoTipo: 'PRE' | 'CO' = 'PRE';
  errorRestriccion: string = '';
  mostrarFormRestriccion: boolean = false;
  mostrarRestricciones = false;
  mostrarMenuExport = false;
  ramoHover: any = null;
  semestrePorCodigo = new Map<string, number>();

  ngOnInit(): void {
    this.contexto = this.route.snapshot.data['contexto'] ?? 'carrera';
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) return;

      this.cargarPlan(id);
      this.cargarMalla(id);
      this.cargarRestricciones(id);
    });
  }
   seleccionarRamo(r: any) {
      this.ramoSeleccionado = r;
      this.cdr.detectChanges();
    }
// Para normalizar
    public normCodigo(v: any): string {
      return String(v ?? '').trim().toUpperCase();
    }
    private getSemestre(nro: any): number {
      const s = String(nro ?? '').trim();
      if (!s) return 0;
      const part = s.split('.')[0];
      const n = Number(part);
      return Number.isFinite(n) ? n : 0;
    }
    // Orden por "1.1", "1.2", ..., "10.1"
    private parseNro(nro: any): number[] {
      const s = String(nro ?? '').trim();
      if (!s) return [Number.MAX_SAFE_INTEGER];
      return s.split('.').map(p => {
        const n = Number(p);
        return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
      });
    }
    private compareNroAsc(a: any, b: any): number {
      const A = this.parseNro(a);
      const B = this.parseNro(b);
      const len = Math.max(A.length, B.length);
      for (let i = 0; i < len; i++) {
        const x = A[i] ?? 0;
        const y = B[i] ?? 0;
        if (x !== y) return x - y;
      }
      return 0;
    }
    //Carga del plan y malla 
    private cargarPlan(id: number) {
      this.planService.getPlan(id).subscribe({
        next: (data) => {
          this.plan = data;
      this.cdr.detectChanges();
        },
        error: (err) => console.error('Error plan', err)
      });
    }
    private cargarMalla(id: number) {
      this.planService.getMalla(id).subscribe({
        next: (data) => {
          this.malla = data || [];
          this.buildMallaVisual();
          this.indexSemestres(this.malla);
        },
        error: (err) => console.error('Error malla', err)
      });
    }
    private buildMallaVisual() {
      const map: Record<number, any[]> = {};

      for (const ramo of this.malla ?? []) {
        const sem = this.getSemestre(ramo.nro);
        if (!map[sem]) map[sem] = [];
        map[sem].push(ramo);
      }

      // ordenar dentro de cada semestre
      for (const key of Object.keys(map)) {
        map[Number(key)].sort((r1, r2) => this.compareNroAsc(r1.nro, r2.nro));
      }

      this.mallaPorSemestre = map;
      this.semestres = Object.keys(map)
        .map(Number)
        .filter(n => n > 0)
        .sort((a, b) => a - b);
        
      this.cdr.detectChanges();
    }  
    //Carga de restricciones
    private cargarRestricciones(id: number) {
      this.planService.getRestricciones(id).subscribe({
        next: (data) => {
          this.restricciones = data || [];
          this.buildRestriccionesMaps();
        },
        error: (err) => {
          console.error('Error restricciones', err);
          this.restricciones = [];
          this.preReqMap.clear();
          this.depMap.clear();
          this.coReqMap.clear();
        }
      });
    }
    private buildRestriccionesMaps() {
      this.preReqMap.clear();
      this.depMap.clear();
      this.coReqMap.clear();

      for (const r of this.restricciones) {
      const tipo = this.normCodigo(r.tipo); // "PRE" o "CO"
      const ramo = this.normCodigo(r.ramo_codigo);
      const req  = this.normCodigo(r.req_codigo);

      if (!tipo || !ramo || !req) continue;
      if (ramo === req) continue;

      if (tipo === 'PRE') {
        if (!this.preReqMap.has(ramo)) this.preReqMap.set(ramo, new Set());
        this.preReqMap.get(ramo)!.add(req);

        if (!this.depMap.has(req)) this.depMap.set(req, new Set());
        this.depMap.get(req)!.add(ramo);
      }

      if (tipo === 'CO') {
        if (!this.coReqMap.has(ramo)) this.coReqMap.set(ramo, new Set());
        this.coReqMap.get(ramo)!.add(req);

        // (opcional) si quieres que CO sea “simétrico”, agrega también al revés:
        if (!this.coReqMap.has(req)) this.coReqMap.set(req, new Set());
        this.coReqMap.get(req)!.add(ramo);
        }
      }
  }
  // resaltado al seleccionar un ramo 
  private getCodigoActivo(): string | null {
    const cod = this.ramoHover?.codigo ?? this.ramoSeleccionado?.codigo;
    return cod ? this.normCodigo(cod) : null;
  }
  isCorrequisitoDeSeleccionado(codigo: string): boolean {
    const activo = this.getCodigoActivo();
    if (!activo) return false;
    const C = this.normCodigo(codigo);
    return this.coReqMap.get(activo)?.has(C) ?? false;
  }
  isDependienteDelSeleccionado(codigo: string): boolean {
    const activo = this.getCodigoActivo();
    if (!activo) return false;
    const C = this.normCodigo(codigo);
    return this.depMap.get(activo)?.has(C) ?? false;
  }
  getPreReqList(codigo: string): string[] {
    const set = this.preReqMap.get(this.normCodigo(codigo));
    return set ? Array.from(set) : [];
  }
  getCoReqList(codigo: string): string[] {
    const set = this.coReqMap.get(this.normCodigo(codigo));
    return set ? Array.from(set) : [];
  }
  toggleRestricciones() {
    this.mostrarRestricciones = !this.mostrarRestricciones;
  }
  onRestriccionesSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivoRestricciones = file;
    this.nombreArchivoRestricciones = file?.name ?? '';
  }
  descargarPlantillaRestricciones() {
    this.planService.descargarPlantillaRestricciones().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_restricciones_malla.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error(err);
        alert('No se pudo descargar la plantilla');
      }
    });
  }
  subirRestriccionesCSV() {
    if (!this.plan?.id) return;
    if (!this.archivoRestricciones) { alert('Selecciona un CSV'); return; }

    const fd = new FormData();
    fd.append('accion', 'importar_restricciones');
    fd.append('plan_id', String(this.plan.id));
    fd.append('file', this.archivoRestricciones); // <- tiene que llamarse "file"

    this.planService.importarRestriccionesFD(fd).subscribe({
      next: (res: any) => {
        console.log('Import restricciones OK:', res);
        alert(`Importadas: ${res.insertadas ?? 0} | Ignoradas: ${res.ignoradas ?? 0} | Omitidas: ${res.omitidas ?? 0}`);

        // refrescar restricciones en pantalla
        if (this.plan?.id) this.cargarRestricciones(this.plan.id);
      },
      error: (err) => {
        console.error('Error importando restricciones:', err);
        alert('Error importando restricciones (revisa consola/network)');
      }
    });
  }
  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  toggleExportMenu() {
    this.mostrarMenuExport = !this.mostrarMenuExport;
  }
  cerrarExportMenu() {
    this.mostrarMenuExport = false;
  }
  // para la vista rapisa de las restricciones
  onRamoEnter(r: any) {
    this.ramoHover = r;
    const cod = this.normCodigo(r.codigo);
    const sem = this.semestrePorCodigo.get(cod);
  }
  onRamoLeave(r: any) {
    // evita borrar si entraste a otro ramo muy rápido
    if (this.ramoHover?.codigo === r?.codigo) {
      this.ramoHover = null;
      this.cdr.detectChanges();
    }
  } 
// Mapas para acceso rápido a correquisitos y prerequisitos
   private parseSemestre(nro: any): number | null {
    const s = String(nro ?? '').trim();
    if (!s) return null;
    const sem = parseInt(s.split('.')[0], 10);
    return Number.isFinite(sem) ? sem : null;
  }
  private indexSemestres(malla: any[]) {
    this.semestrePorCodigo.clear();
    for (const r of (malla ?? [])) {
      const cod = this.normCodigo(r.codigo);
      const sem = this.parseSemestre(r.nro);
      if (cod && sem != null) this.semestrePorCodigo.set(cod, sem);
    }
  }
  getPreImplicitosDesdeCO(codigoActivoRaw: string | null | undefined): Set<string> {
    const activo = codigoActivoRaw ? this.normCodigo(codigoActivoRaw) : '';
    const out = new Set<string>();
    if (!activo) return out;

    const semAct = this.semestrePorCodigo.get(activo);
    if (semAct == null) return out;

    // Si X es CO con Y y Y está en semestre menor, entonces Y cuenta como PRE implícito de X.
    for (const y of (this.coReqMap.get(activo) ?? [])) {
      const semY = this.semestrePorCodigo.get(y);
      if (semY != null && semY < semAct) out.add(y);
    }

    return out;
  }
  getPreTotales(codigoActivoRaw: string | null | undefined): Set<string> {
    const activo = codigoActivoRaw ? this.normCodigo(codigoActivoRaw) : '';
    const out = new Set<string>();
    if (!activo) return out;

    // explícitos
    for (const p of (this.preReqMap.get(activo) ?? [])) out.add(p);

    // implícitos por CO (orientado)
    for (const p of this.getPreImplicitosDesdeCO(activo)) out.add(p);

    // por si acaso
    out.delete(activo);
    return out;
  }
  getCoDirectos(codigoActivoRaw: string | null | undefined): Set<string> {
    const activo = codigoActivoRaw ? this.normCodigo(codigoActivoRaw) : '';
    return new Set(this.coReqMap.get(activo) ?? []);
  }
  getClaseRestriccion(codigo: string): string {
    const activoRaw = this.ramoHover?.codigo ?? this.ramoSeleccionado?.codigo;
    if (!activoRaw) return '';

    const target = this.normCodigo(codigo);

    // PRE primero
    if (this.getPreTotales(activoRaw).has(target)) return 'prereq';

    // CO directos solo verde
    const activo = this.normCodigo(activoRaw);
    if ((this.coReqMap.get(activo) ?? new Set()).has(target)) return 'coreq';

    // independiente (opcional)
    if (this.isIndependienteBD?.(codigo)) return 'independiente';
    return '';
  }
  getPreActivosList(): string[] {
    const activoRaw = this.ramoHover?.codigo ?? this.ramoSeleccionado?.codigo;
    return Array.from(this.getPreTotales(activoRaw));
  }
  getCoActivosList(): string[] {
    const activoRaw = this.ramoHover?.codigo ?? this.ramoSeleccionado?.codigo;
    return Array.from(this.getCoVisibles(activoRaw));
  }
  isIndependienteBD(codigo: string): boolean {
    const cod = this.normCodigo(codigo);
    const tienePre = (this.preReqMap.get(cod)?.size ?? 0) > 0;
    const tieneCo  = (this.coReqMap.get(cod)?.size ?? 0) > 0;
    return !tienePre && !tieneCo;
  }
  getIndependientesBD(): string[] {
    return (this.malla ?? [])
      .map(r => this.normCodigo(r.codigo))
      .filter(c => !!c)
      .filter(c => this.isIndependienteBD(c))
      .sort();
  }
  isIndependienteReal(codigo: string): boolean {
    const cod = this.normCodigo(codigo);
    const preTotales = this.getPreTotales(cod);   // usa tu regla C
    const tienePre = preTotales.size > 0;
    const tieneCo  = (this.coReqMap.get(cod)?.size ?? 0) > 0;
    return !tienePre && !tieneCo;
  }
  getIndependientesReales(): string[] {
    return (this.malla ?? [])
      .map(r => this.normCodigo(r.codigo))
      .filter(c => !!c)
      .filter(c => this.isIndependienteReal(c))
      .sort();
  }
  getCoVisibles(codigoActivoRaw: string | null | undefined): Set<string> {
    const activo = codigoActivoRaw ? this.normCodigo(codigoActivoRaw) : '';
    if (!activo) return new Set<string>();

    const co = new Set<string>(this.coReqMap.get(activo) ?? []);
    const preImplicitos = this.getPreImplicitosDesdeCO(activo);

    // quita de CO los que estás tratando como PRE implícitos
    for (const p of preImplicitos) co.delete(p);

    return co;
  }  
  toggleFormRestriccion() {
    this.mostrarFormRestriccion = !this.mostrarFormRestriccion;
  }
  crearRestriccionManual() {
    const ramo = this.normCodigo(this.nuevoRamo);
    const req  = this.normCodigo(this.nuevoReq);

    if (!ramo || !req) { this.errorRestriccion = 'Selecciona ambos ramos.'; return; }
    if (ramo === req)  { this.errorRestriccion = 'Un ramo no puede ser requisito de sí mismo.'; return; }

    this.errorRestriccion = '';
    this.planService.crearRestriccion({
      plan_id: this.plan.id,
      ramo_codigo: ramo,
      req_codigo: req,
      tipo: this.nuevoTipo
    }).subscribe({
      next: () => {
        this.nuevoRamo = '';
        this.nuevoReq  = '';
        this.cargarRestricciones(this.plan.id); // refresca los mapas
      },
      error: (err) => {
        this.errorRestriccion = err?.error?.error || 'Error al crear restricción.';
      }
    });
  }
  eliminarRestriccion(id: number) {
    if (!confirm('¿Eliminar esta restricción?')) return;
    this.planService.eliminarRestriccion(id).subscribe({
      next: () => this.cargarRestricciones(this.plan.id),
      error: (err) => console.error('Error al eliminar', err)
    });
  }
  exportarMallaPDF() {
  if (!this.plan?.id) return;
  this.planService.exportarMallaPDF(this.plan.id).subscribe({
    next: (blob) => this.downloadBlob(blob, `malla_plan_${this.plan.anio}.pdf`),
    error: (err) => { console.error(err); alert('No se pudo exportar PDF'); }
  });
}
}
