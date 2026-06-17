import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { CertificadoService, ActividadItem, ListasActividades } from '../../servicios/certificado.service';

interface AlumnoOpcion {
  id: number;
  rut: string;
  nombre_completo: string;
}

interface EntradaCertificado {
  alumno:          AlumnoOpcion;
  nombreCert:      string;
  tipoExtra:       'asignatura' | 'actividad';
  itemSeleccionado: ActividadItem | null;
  fechaEmision:    string;
  archivoPDF:      File;
  nombreArchivo:   string;
  estado:          'pendiente' | 'subiendo' | 'ok' | 'error';
  mensajeEstado:   string;
  codigoGenerado:  string;
}

@Component({
  selector: 'app-subir-certificado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subir-certificado.html',
  styleUrls: ['./subir-certificado.css']
})
export class SubirCertificado implements OnInit {

  // ── Listas desde BD ───────────────────────────────────
  asignaturas: ActividadItem[] = [];
  actividades: ActividadItem[] = [];
  cargandoListas = false;

  // ── Búsqueda ──────────────────────────────────────────
  textoBusqueda = '';
  resultados: AlumnoOpcion[] = [];
  buscando = false;
  private timeout: any;

  // ── Alumno seleccionado ───────────────────────────────
  alumnoSeleccionado: AlumnoOpcion | null = null;

  // ── Formulario ────────────────────────────────────────
  nombreCert        = '';
  tipoExtra: 'asignatura' | 'actividad' = 'asignatura';
  itemSeleccionado: ActividadItem | null = null;
  // Fecha se genera automáticamente
  fechaEmision      = this.hoyISO();
  archivoPDF:  File | null = null;
  nombreArchivo     = '';
  errorForm         = '';

  // Nueva actividad personalizada
  mostrarFormNueva  = false;
  nuevaActividadNombre = '';
  nuevaActividadTipo: 'asignatura' | 'actividad' = 'actividad';
  guardandoNueva    = false;

  // ── Lista acumulada ───────────────────────────────────
  entradas: EntradaCertificado[] = [];

  // ── Estado global ─────────────────────────────────────
  subiendo   = false;
  error      = '';
  exitoTotal = 0;

  private apiBase = 'http://localhost/api';

  constructor(
    private http: HttpClient,
    private certificadoService: CertificadoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarListas();
  }

  // ── Carga asignaturas y actividades ───────────────────
  cargarListas(): void {
    this.cargandoListas = true;
    this.certificadoService.getActividades().subscribe({
      next: (data: ListasActividades) => {
        this.asignaturas    = data.asignaturas;
        this.actividades    = data.actividades;
        this.cargandoListas = false;
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoListas = false; }
    });
  }

  // ── Lista según tipo seleccionado ─────────────────────
  get listaActual(): ActividadItem[] {
    return this.tipoExtra === 'asignatura' ? this.asignaturas : this.actividades;
  }

  cambiarTipo(tipo: 'asignatura' | 'actividad'): void {
    this.tipoExtra        = tipo;
    this.itemSeleccionado = null;
    this.mostrarFormNueva = false;
  }

  // ── Agrega nueva actividad a la BD ────────────────────
  guardarNuevaActividad(): void {
    if (!this.nuevaActividadNombre.trim()) return;
    this.guardandoNueva = true;

    this.http.post<{ ok: boolean; id: number }>(
      `${this.apiBase}/obtener_actividades.php`,
      { nombre: this.nuevaActividadNombre.trim(), tipo: this.nuevaActividadTipo },
      { headers: { 'Content-Type': 'application/json',
                   Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } }
    ).subscribe({
      next: (res) => {
        const nueva: ActividadItem = {
          id: res.id,
          nombre: this.nuevaActividadNombre.trim(),
          tipo: this.nuevaActividadTipo
        };
        if (this.nuevaActividadTipo === 'asignatura') this.asignaturas.push(nueva);
        else                                           this.actividades.push(nueva);

        this.itemSeleccionado     = nueva;
        this.tipoExtra            = this.nuevaActividadTipo;
        this.mostrarFormNueva     = false;
        this.nuevaActividadNombre = '';
        this.guardandoNueva       = false;
        this.cdr.detectChanges();
      },
      error: () => { this.guardandoNueva = false; }
    });
  }

  // ── Búsqueda alumno ───────────────────────────────────
  onBusqueda(): void {
    clearTimeout(this.timeout);
    const q = this.textoBusqueda.trim();
    if (q.length < 2) { this.resultados = []; return; }

    this.timeout = setTimeout(() => {
      this.buscando = true;
      this.http.get<AlumnoOpcion[]>(
        `${this.apiBase}/buscar_alumno.php?q=${encodeURIComponent(q)}`
      ).subscribe({
        next: (data) => {
          const ids = this.entradas.map(e => e.alumno.id);
          this.resultados = data.filter(a => !ids.includes(a.id));
          this.buscando   = false;
          this.cdr.detectChanges();
        },
        error: () => { this.buscando = false; }
      });
    }, 350);
  }

  seleccionarAlumno(alumno: AlumnoOpcion): void {
    this.alumnoSeleccionado = alumno;
    this.textoBusqueda      = '';
    this.resultados         = [];
    this.fechaEmision       = this.hoyISO(); // fecha actual automática
  }

  cambiarAlumno(): void {
    this.alumnoSeleccionado = null;
    this.limpiarFormulario();
  }

  onArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;
    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.errorForm = 'Solo se permiten archivos PDF.';
      return;
    }
    this.archivoPDF    = file;
    this.nombreArchivo = file.name;
    this.errorForm     = '';
  }

  agregarALista(): void {
    this.errorForm = '';
    if (!this.alumnoSeleccionado)   { this.errorForm = 'Selecciona un alumno.'; return; }
    if (!this.nombreCert.trim())    { this.errorForm = 'Ingresa el nombre del certificado.'; return; }
    if (!this.itemSeleccionado)     { this.errorForm = 'Selecciona una asignatura o actividad.'; return; }
    if (!this.archivoPDF)           { this.errorForm = 'Selecciona un archivo PDF.'; return; }

    this.entradas.push({
      alumno:           this.alumnoSeleccionado,
      nombreCert:       this.nombreCert.trim(),
      tipoExtra:        this.tipoExtra,
      itemSeleccionado: this.itemSeleccionado,
      fechaEmision:     this.fechaEmision,
      archivoPDF:       this.archivoPDF,
      nombreArchivo:    this.nombreArchivo,
      estado:           'pendiente',
      mensajeEstado:    '',
      codigoGenerado:   ''
    });

    this.alumnoSeleccionado = null;
    this.limpiarFormulario();
    this.cdr.detectChanges();
  }

  eliminarEntrada(i: number): void {
    this.entradas.splice(i, 1);
    this.cdr.detectChanges();
  }

  async subirTodos(): Promise<void> {
    if (this.entradas.length === 0) { this.error = 'Agrega al menos un alumno.'; return; }
    this.error     = '';
    this.exitoTotal = 0;
    this.subiendo  = true;

    for (const entrada of this.entradas) {
      if (entrada.estado === 'ok') { this.exitoTotal++; continue; }

      entrada.estado        = 'subiendo';
      entrada.mensajeEstado = 'Subiendo...';
      this.cdr.detectChanges();

      const formData = new FormData();
      formData.append('alumno_id',     String(entrada.alumno.id));
      formData.append('alumno_rut',    entrada.alumno.rut);
      formData.append('nombre',        entrada.nombreCert);
      formData.append('asignatura',    entrada.tipoExtra === 'asignatura' ? entrada.itemSeleccionado!.nombre : '');
      formData.append('actividad',     entrada.tipoExtra === 'actividad'  ? entrada.itemSeleccionado!.nombre : entrada.itemSeleccionado!.nombre);
      formData.append('fecha_emision', entrada.fechaEmision);
      formData.append('pdf',           entrada.archivoPDF);

      try {
        const res = await this.http.post<{ ok: boolean; codigo: string }>(
          `${this.apiBase}/subir_certificado.php`,
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } }
        ).toPromise();

        entrada.estado         = 'ok';
        entrada.codigoGenerado = res?.codigo ?? '';
        entrada.mensajeEstado  = `Código: ${res?.codigo}`;
        this.exitoTotal++;
      } catch {
        entrada.estado        = 'error';
        entrada.mensajeEstado = 'Error al subir.';
      }
      this.cdr.detectChanges();
    }

    this.subiendo = false;
    this.cdr.detectChanges();
  }

  resetearTodo(): void {
    this.entradas           = [];
    this.alumnoSeleccionado = null;
    this.exitoTotal         = 0;
    this.error              = '';
    this.limpiarFormulario();
  }

  private hoyISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  private limpiarFormulario(): void {
    this.nombreCert           = '';
    this.tipoExtra            = 'asignatura';
    this.itemSeleccionado     = null;
    this.fechaEmision         = this.hoyISO();
    this.archivoPDF           = null;
    this.nombreArchivo        = '';
    this.errorForm            = '';
    this.mostrarFormNueva     = false;
    this.nuevaActividadNombre = '';
  }

  get todosExitosos(): boolean {
    return this.entradas.length > 0 && this.entradas.every(e => e.estado === 'ok');
  }
}