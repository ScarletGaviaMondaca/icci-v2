import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SeguimientoService } from '../../servicios/seguimiento.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs';
import { AuthService } from '../../servicios/auth.service';
import { EmpresaService } from '../../servicios/empresa.service';

@Component({
  selector: 'app-seguimiento-practica',
  imports: [ FormsModule, CommonModule ],
  templateUrl: './seguimiento-practica.html',
  styleUrl: './seguimiento-practica.css',
})

export class SeguimientoPractica implements OnInit {
  alumno_id: number = 0;
  practicaNum: number = 1; // 1 o 2 según tab
  alumnos: any[] = [];
  alumno: any; // Para mostrar solo el alumno específico
  estados = [
    { value: 0, label: 'No iniciado', color: 'blanco' },
    { value: 1, label: 'Pendiente', color: 'amarillo' },
    { value: 2, label: 'Aprobado', color: 'verde' },
    { value: 3, label: 'Reprobado', color: 'rojo' },
  ];
    // Los 6 hitos, con claves para los campos de fecha y estado:
  hitos = [
      {
        key: 'practica1_estado',
        label: 'Hito 1:Estudiante en Práctica',
        fechaInicio: 'practica1_fecha_inicio',
        fechaTermino: 'practica1_fecha_termino',
        empresa: 'practica1_empresa',
        horasSem: 'practica1_horas_sem',
        horasTot: 'practica1_horas_tot',
        supervisor: 'practica1_supervisor',
        numero_carta: 'numero_carta',
      },
      {
        key: 'informe_elab_estado',
        label: 'Hito 2: Elaboración del Informe',
        fechaInicio: 'informe_elab_fecha_inicio',
        fechaTermino: 'informe_elab_fecha_termino'
      },
      {
        key: 'informe_rev_estado',
        label: 'Hito 3: Revisión del Informe',
        fechaInicio: 'informe_rev_fecha_inicio',
        fechaTermino: 'informe_rev_fecha_termino'
      },
      {
        key: 'eval_empresa_estado',
        label: 'Hito 4: Evaluación Empresa',
        fechaInicio: 'eval_empresa_fecha_inicio',
        fechaTermino: 'eval_empresa_fecha_termino'
      },
      {
        key: 'comite_carrera_estado',
        label: 'Hito 5: Comité de Carrera',
        fechaInicio: 'comite_carrera_fecha_inicio',
        fechaTermino: 'comite_carrera_fecha_termino'
      },
      {
        key: 'envioreg_estado',
        label: 'Hito 6: Envío a Registraduría',
        fechaInicio: 'envioreg_fecha_inicio',
        fechaTermino: 'envioreg_fecha_termino'
      }
    ];
    tempEstados: number[] = [];
    mensaje: string | null = null;
    mensajeGlobal: string | null = null; 
    hitoDuraciones = [
        '',           // PRIMER hito: no se muestra duración, porque tiene extras
        '30 días',     // Elab. Informe
        '10 días',     // Rev. Informe
        '10 días',     // Eval. Informe
        '15 días',     // Comité Carrera
        '7 días'      // Envío Registro
      ];
    
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seg: SeguimientoService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService,
    private empresaSvc: EmpresaService
  ) {}

  tempDatos: any[] = [];
  alumno_id_actual: number = 0; 
  observaciones: any[] = [];
  nuevaFechaObservacion = { fecha_recepcion: '', fecha_fin_recepcion: ''};
  fechasObservacion: any[] = [];
  guardandoObs = false;
  fechaFinPendiente: string = '';
  subiendoEvalEmpresa = false;
  archivoEvalEmpresa: File | null = null;
  hitosDesbloqueados: number[] = [];
  mostrarModalActa = false;
  calificacion = 'APROBADO';
  //duracion hitos 
  duraciones: any[] = [];
  hitosExpandidos: number[] = [];
  horasCalculadas: string | null = null;
  //Hito 1
  semestre = '';
  empresas: any[] = [];
  nuevaEmpresa = '';
  agregandoEmpresa = false;
  // Datos para el acta
  registradora = 'MARLENE CISTERNAS RIVEROS';
  practica_anio_aprobacion: number | null = null;
  practica_semestre_aprobacion = '';

  // Modal marcar completado
  mostrarModalCompletar = false;
  hitoACompletar: number | null = null;

  // hito 6
  mostrarModalHito6 = false;
  envioreg_fecha_envio = '';

  aniosDisponibles: number[] = [];
  semestresDisponibles: string[] = [];
  //Subir acta firmada
  subiendoActaFirmada = false;
  archivoActaFirmada: File | null = null;

  // Modal fecha entrega
  mostrarModalFechaEntrega = false;
  hitoEntrega: number | null = null;
  fechaEntregaInput = '';

  // Nombres de campos fecha entrega por hito
  fechaEntregaCampos: { [key: number]: string } = {
    1: 'informe_elab_fecha_entrega',
    2: 'informe_rev_fecha_entrega',
    3: 'eval_empresa_fecha_entrega',
    4: 'comite_carrera_fecha_entrega',
    5: 'envioreg_fecha_entrega',
  };
  fechaEntregaClaves: { [key: number]: string } = {
    1: 'informe_elab_fecha_entrega',
    2: 'informe_rev_fecha_entrega',
    3: 'eval_empresa_fecha_entrega',
    4: 'comite_carrera_fecha_entrega',
    5: 'envioreg_fecha_entrega',
  };
  hitosCamposAprobacion = [
    'practica1_fecha_aprobacion',
    'informe_elab_fecha_aprobacion',
    'informe_rev_fecha_aprobacion',
    'eval_empresa_fecha_aprobacion',
    'comite_carrera_fecha_aprobacion',
    'envioreg_fecha_aprobacion',
  ];
  //carta de solicitud
  cartaSolicitudUrl: string | null = null;
  generandoCarta = false;
  generandoFormulario = false;
  generandoInformeConf = false;

 private calcularSemestreAnterior(): string {
    const mes = new Date().getMonth() + 1;
    const anio = new Date().getFullYear();
    return mes <= 7 ? `II SEM/${anio - 1}` : `I SEM/${anio}`;
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      const anioActual = new Date().getFullYear();
      this.aniosDisponibles = [anioActual - 1, anioActual];
      this.semestresDisponibles = ['I SEM', 'II SEM'];
      this.aniosDisponibles.forEach(a => {
        this.semestresDisponibles.push(`I SEM/${a}`);
        this.semestresDisponibles.push(`II SEM/${a}`);
      });
      this.semestre = this.calcularSemestreAnterior();
      this.alumno_id_actual = id;
      this.practicaNum = +params['practica_num'];
      this.cargarAlumnoActual();
      this.cargarDuraciones();
      this.cdr.detectChanges();
    });
  }
  volver() {
    this.router.navigate(['/seguimiento/candidatos']);  // o la ruta donde está tu tabla
  }
  cargarAlumnoActual() {
    this.empresaSvc.listar().subscribe(e => {
      this.empresas = e.map((emp: any) => ({ ...emp, id: Number(emp.id) }));
    });

    this.seg.obtenerAlumno(this.alumno_id_actual, this.practicaNum).subscribe((data: any) => {
      const arr = Array.isArray(data) ? data : [data];
      const seg = arr[0]; // raw query devuelve datos planos directamente

      if (!seg || !seg.seguimiento_id) {
        console.warn('No hay seguimiento para este alumno');
        return;
      }
      this.alumno = {
        ...seg,
        alumno_id: seg.alumno_id ?? seg.id,
      };
      this.calificacion = Number(seg.comite_carrera_estado) === 3 ? 'REPROBADO' : 'APROBADO';
      const camposFecha = [
        'practica1_fecha_inicio', 'practica1_fecha_termino',
        'informe_elab_fecha_inicio', 'informe_elab_fecha_termino',
        'informe_rev_fecha_inicio', 'informe_rev_fecha_termino',
        'eval_empresa_fecha_inicio', 'eval_empresa_fecha_termino',
        'comite_carrera_fecha_inicio', 'comite_carrera_fecha_termino',
        'envioreg_fecha_inicio', 'envioreg_fecha_termino',
        'informe_elab_fecha_entrega', 'informe_rev_fecha_entrega',
        'eval_empresa_fecha_entrega', 'comite_carrera_fecha_entrega',
        'envioreg_fecha_entrega', 'envioreg_fecha_envio','practica1_fecha_aprobacion',
        'informe_elab_fecha_aprobacion', 'informe_rev_fecha_aprobacion',
        'eval_empresa_fecha_aprobacion', 'comite_carrera_fecha_aprobacion',
        'envioreg_fecha_aprobacion',
      ];

      camposFecha.forEach(campo => {
        if (this.alumno[campo] instanceof Date) {
          this.alumno[campo] = this.alumno[campo].toISOString().split('T')[0];
        } else if (this.alumno[campo] && typeof this.alumno[campo] === 'string') {
          this.alumno[campo] = this.alumno[campo].split('T')[0];
        }
      });
      console.log('alumno:', this.alumno.nombres, this.alumno.rut, 'seg_id:', this.alumno.seguimiento_id);
      if (this.alumno.practica_semestre_aprobacion) {
        this.semestre = this.alumno.practica_semestre_aprobacion;
      }
      if (this.alumno.envioreg_fecha_envio) {
        this.envioreg_fecha_envio = this.alumno.envioreg_fecha_envio;
      }

      this.inicializarTempDatos();
      this.cargarFechasObservacion();
      this.cdr.detectChanges();
    });
  }
  inicializarTempDatos() {
    this.tempDatos = this.hitos.map((h, idx) => ({
      estado: Number(this.alumno[h.key] ?? 0),
      fechaInicio: this.alumno[h.fechaInicio] ?? '',
      fechaTermino: this.alumno[h.fechaTermino] ?? '',
      ...(h.empresa ? { empresa: this.alumno[h.empresa] ?? '' } : {}),
      ...(h.horasSem ? { horasSem: this.alumno[h.horasSem] ?? '' } : {}),
      ...(h.horasTot ? { horasTot: this.alumno[h.horasTot] ?? '' } : {}),
      ...(h.supervisor ? { supervisor: this.alumno[h.supervisor] ?? '' } : {}),
      ...(h.numero_carta ? { numero_carta: this.alumno[h.numero_carta] ?? '' } : {}),
      ...(idx === 0 ? {
        empresa_id:   Number(this.alumno['empresa_id']) ?? '',
        jefe:         this.alumno['practica1_jefe'] ?? '',
        correo:       this.alumno['practica1_correo'] ?? '',
        telefono:     this.alumno['practica1_telefono'] ?? '',
        herramientas: this.alumno['herramientas'] ?? '',
      } : {}),
    }));
    this.cargarFechasObservacion();
    this.cartaSolicitudUrl = this.alumno.carta_solicitud 
    ? 'http://localhost/' + this.alumno.carta_solicitud 
    : null;
    this.cdr.detectChanges();
  }
  // Carga duraciones desde BD
  cargarDuraciones() {
    this.seg.getDuraciones().subscribe(d => {
      this.duraciones = d;
    });
  }
  // Obtiene duración de un hito
  getDuracion(hitoNum: number): any {
    return this.duraciones.find(
      d => d.hito_num === hitoNum + 1 && 
          d.practica_num === this.practicaNum
    );
  }
  // Calcula fecha término al ingresar fecha inicio
  calcularFechaTermino(i: number) {
    const fechaInicio = this.tempDatos[i]?.fechaInicio;
    const dur = this.getDuracion(i);
    
    if (!fechaInicio || !dur) return;
    
    let fechaTermino: Date | null = null;
    const inicio = new Date(fechaInicio);
    
    if (dur.duracion_horas) {
      const horasSem = Number(this.tempDatos[0]?.horasSem ?? 0);
      if (horasSem <= 0) {
        // Mostrar mensaje en vez de no hacer nada
        this.horasCalculadas = '⚠️ Ingresa las horas semanales para calcular la fecha';
        this.cdr.detectChanges();
        return;
      }
      const diasNecesarios = Math.ceil(dur.duracion_horas * 7 / horasSem);
      fechaTermino = new Date(inicio);
      fechaTermino.setDate(inicio.getDate() + diasNecesarios)

    } else if (dur.duracion_dias) {
      fechaTermino = new Date(inicio);
      fechaTermino.setDate(inicio.getDate() + dur.duracion_dias);
    }

    if (fechaTermino) {
      this.tempDatos[i].fechaTermino = fechaTermino.toISOString().split('T')[0];
      this.calcularHorasTotales(i);
      this.cdr.detectChanges();
    }
  }
  // Calcula horas hábiles entre dos fechas (hito 1)
  calcularHorasHabiles(i: number) {
    if (i !== 0) return;
    const inicio = this.tempDatos[0]?.fechaInicio;
    const termino = this.tempDatos[0]?.fechaTermino;
    const horasSem = Number(this.tempDatos[0]?.horasSem ?? 0);

    if (!inicio || !termino || horasSem <= 0) {
      this.horasCalculadas = null;
      return;
    }

    const d1 = new Date(inicio);
    const d2 = new Date(termino);
    const dias = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    const semanas = dias / 7;
    const horas = Math.round(semanas * horasSem);

    this.horasCalculadas = `${horas} horas de práctica`;
    this.cdr.detectChanges();
  }
  // Control de expansión de hitos
  hitoExpandido(i: number): boolean {
    // Siempre expandido si está desbloqueado
    if (this.hitosDesbloqueados.includes(i)) return true;
    // Expandido si está pendiente
    if (this.alumno && Number(this.alumno[this.hitos[i].key]) === 1) return true;
    // Expandido si está en hitosExpandidos manual
    return this.hitosExpandidos.includes(i);
  }
  //para editar los hitos 
  toggleDesbloqueo(i: number) {
    if (this.hitosDesbloqueados.includes(i)) {
      this.hitosDesbloqueados = this.hitosDesbloqueados.filter(x => x !== i);
      // Al bloquear, quitar de expandidos también
      this.hitosExpandidos = this.hitosExpandidos.filter(x => x !== i);
    } else {
      this.hitosDesbloqueados = [...this.hitosDesbloqueados, i];
      // Al desbloquear, expandir automáticamente
      if (!this.hitosExpandidos.includes(i)) {
        this.hitosExpandidos = [...this.hitosExpandidos, i];
      }
    }
    this.cdr.detectChanges();
  }
  puedeEditarHito(i: number): boolean {
      // Si está desbloqueado temporalmente, siempre puede editar
    if (this.hitosDesbloqueados.includes(i)) return true;
    return false;
  }
 hitoEstaPendiente(i: number): boolean {
    if (!this.alumno) return false;
    const key = this.hitos[i].key;
    const estado = Number(this.alumno[key]);
    return estado === 1 || estado === 3; // Pendiente o Reprobado
  }
  get obsAbierta(): any | null {
    return this.fechasObservacion.find(o => !o.fecha_fin_recepcion) ?? null;
  }
  async guardarHito(i: number) {
    console.log('🔥 guardarHito llamado, i:', i);
    this.mensajeGlobal = null;
    if (!this.alumno || !this.alumno.alumno_id) {
      console.log('❌ No hay alumno');
      this.mensajeGlobal = "No se detectó el alumno, recarga la página o selecciona nuevamente.";
      return;
    }
    const h = this.hitos[i];
    const datos = this.tempDatos[i];
    console.log('datos del hito:', datos);

    // Validaciones...
    if ( !datos.fechaInicio || !datos.fechaTermino) {
      console.log('❌ Faltan fechas:', datos.fechaInicio, datos.fechaTermino);
      this.mensajeGlobal = "🚫 Complete todos los campos requeridos.";
      return;
    }
    const updates: { campo: string, valor: any }[] = [
      { campo: h.key, valor: Number(datos.estado) },
      { campo: h.fechaInicio, valor: datos.fechaInicio },
      { campo: h.fechaTermino, valor: datos.fechaTermino }
    ];  
  if (i === 0) {
    updates.push(
      { campo: 'empresa_id',         valor: datos.empresa_id ?? null },
      { campo: 'practica1_jefe',     valor: datos.jefe ?? '' },
      { campo: 'practica1_correo',   valor: datos.correo ?? '' },
      { campo: 'practica1_telefono', valor: datos.telefono ?? '' },
      { campo: 'practica1_empresa',  valor: datos.empresa ?? '' },
      { campo: 'practica1_horas_sem',  valor: datos.horasSem ?? '' },
      { campo: 'practica1_horas_tot',  valor: datos.horasTot ?? '' },
      { campo: 'practica1_supervisor', valor: datos.supervisor ?? '' },
      { campo: 'numero_carta',         valor: datos.numero_carta ?? '' },
      { campo: 'herramientas', valor: datos.herramientas ?? '' }
    );
  }
  
  if (i === 4) {
    updates.push(
      { campo: 'practica_semestre_aprobacion', valor: this.semestre },
      { campo: 'practica_anio_aprobacion', valor: Number(this.semestre.match(/\d{4}/)?.[0] ?? 0) }
    );
  }
    try {
      await Promise.all(updates.map(upd =>
        firstValueFrom(
          this.seg.updateCampo({
            alumno_id: Number(this.alumno.alumno_id),
            plan: this.alumno.plan ?? '0',
            practica_num: this.practicaNum,
            campo: upd.campo,
            valor: upd.valor
          })
        )
      ));
      this.hitosDesbloqueados = this.hitosDesbloqueados.filter(x => x !== i);
      this.mensajeGlobal = "✅ Guardado con éxito";
      this.cdr.detectChanges();
      this.cargarAlumnoActual();
      setTimeout(() => {
        this.mensajeGlobal = null;
        this.cdr.detectChanges();
      }, 1500);
    } catch (err: any) {
      if (typeof err?.error === 'string') {
        this.mensajeGlobal = "❌ Error: " + err.error;
      } else {
        this.mensajeGlobal = "❌ Error al guardar, revisa los datos o la conexión.";
      }
      setTimeout(() => this.mensajeGlobal = null, 2000);
      console.log('Guardando hito:', i, 'alumno_id:', this.alumno.alumno_id, 'plan:', this.alumno.plan, 'practica_num:', this.practicaNum);
console.log('Updates:', updates);
    }
  }
  // Funciones para manejar fechas de observación del hito 3
  cargarFechasObservacion() {
    if (!this.alumno?.seguimiento_id) {
      this.fechasObservacion = [];
      return;
    }
    this.seg.getFechasObservacion(this.alumno.seguimiento_id).subscribe((obs: any) => {
      // Asegurarse que sea array
      this.fechasObservacion = Array.isArray(obs) ? obs : 
                              obs?.observaciones ?? [];
      this.cdr.detectChanges();
    });
  }
  agregarFechaObs() {
    console.log('seguimiento_id:', this.alumno?.seguimiento_id);
    console.log('fecha:', this.nuevaFechaObservacion.fecha_recepcion);
    if (!this.nuevaFechaObservacion.fecha_recepcion) {
      this.mensajeGlobal = '🚫 Ingresa la fecha de recepción.';
      return;
    }
    this.guardandoObs = true;
    this.seg.agregarFechaObservacion({
      seguimiento_id: this.alumno.seguimiento_id,
      hito: 'informe_rev',
      fecha_recepcion: this.nuevaFechaObservacion.fecha_recepcion,
    }).subscribe({
      next: (res) => {
        console.log('✅ Respuesta PHP:', res); 
        this.mensajeGlobal = '✅ Fecha de recepción guardada';
        this.nuevaFechaObservacion = { fecha_recepcion: '', fecha_fin_recepcion: '' };
        this.cargarFechasObservacion();
        this.guardandoObs = false;
        setTimeout(() => this.mensajeGlobal = null, 2000);
      },
      error: (err) => {
    console.error('❌ Error texto:', err.error?.text ?? err.message);
        this.mensajeGlobal = '❌ Error al guardar.';
        this.guardandoObs = false;
      }
    });
  }
  cerrarFechaObs() {
    if (!this.fechaFinPendiente) {
      this.mensajeGlobal = '🚫 Ingresa la fecha de fin de recepción.';
      return;
    }
    const obs = this.obsAbierta;
    if (!obs) return;

    this.seg.actualizarFechaFin(obs.id, this.fechaFinPendiente).subscribe({
      next: () => {
        this.mensajeGlobal = '✅ Fecha de cierre guardada';
        this.fechaFinPendiente = '';
        this.cargarFechasObservacion();
        setTimeout(() => this.mensajeGlobal = null, 2000);
      },
      error: () => {
        this.mensajeGlobal = '❌ Error al guardar fecha de cierre.';
      }
    });
  }
// Evaluacion empresa
  onArchivoEvalEmpresa(event: any) {
    this.archivoEvalEmpresa = event.target.files[0] ?? null;
  }
  subirEvalEmpresa() {
    if (!this.archivoEvalEmpresa) {
      this.mensajeGlobal = '🚫 Selecciona un archivo PDF primero.';
      return;
    }
    this.subiendoEvalEmpresa = true;
    const fd = new FormData();
    fd.append('accion', 'subir_eval_empresa');
    fd.append('seguimiento_id', String(this.alumno.seguimiento_id));
    fd.append('alumno_id', String(this.alumno.alumno_id));
    fd.append('plan', this.alumno.plan);
    fd.append('practica_num', String(this.practicaNum));
    fd.append('eval_empresa', this.archivoEvalEmpresa);

    this.seg.subirEvalEmpresa(fd)
    .pipe(
      finalize(() => {
        this.subiendoEvalEmpresa = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.mensajeGlobal = '✅ Evaluación subida correctamente';
        this.alumno.eval_empresa_archivo = res.ruta;
        this.archivoEvalEmpresa = null;
        this.subiendoEvalEmpresa = false;
        setTimeout(() => this.mensajeGlobal = null, 2000);
      },
      error: () => {
        this.mensajeGlobal = '❌ Error al subir la evaluación.';
        this.subiendoEvalEmpresa = false;
      }
    });
  }
  /* Para generar el acta */ 
  generarActa() {
    const token = localStorage.getItem('token') ?? '';
    const url = `http://localhost:3000/generadores/acta` +
      `?seguimiento_id=${this.alumno.seguimiento_id}` +
      `&calificacion=${encodeURIComponent(this.calificacion)}` +
      `&semestre=${encodeURIComponent(this.semestre)}` +
      `&registradora=${encodeURIComponent(this.registradora)}`;

    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Acta_Practica_${this.alumno.practica_num}.docx`;
        link.click();
        this.mostrarModalActa = false;
      });
  }
  agregarEmpresa() {
    if (!this.nuevaEmpresa.trim()) return;
    this.empresaSvc.crear(this.nuevaEmpresa.trim()).subscribe({
      next: (res) => {
        this.empresas = [...this.empresas, { id: res.id, nombre: res.nombre }];
        this.tempDatos[0].empresa_id = res.id;
        this.agregandoEmpresa = false;
        this.nuevaEmpresa = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensajeGlobal = err.error?.error ?? '❌ Error al crear empresa';
      }
    });
  }

  confirmarCompletar(i: number) {
    this.hitoACompletar = i;
    const estado = Number(this.alumno[this.hitos[i].key]);

    if (i === 5) {
      const semMatch = this.semestre.match(/^(I{1,2} SEM)/);
      this.practica_semestre_aprobacion = semMatch ? semMatch[1] : '';
      const anioMatch = this.semestre.match(/\d{4}/);
      if (anioMatch) this.practica_anio_aprobacion = Number(anioMatch[0]);
      this.mostrarModalHito6 = true;
    } else if (estado === 3 && i > 0) {
      // Hito excedido — pedir fecha de entrega real
      this.hitoEntrega = i;
      this.fechaEntregaInput = new Date().toISOString().split('T')[0]; // hoy por defecto
      this.mostrarModalFechaEntrega = true;
    } else {
      this.mostrarModalCompletar = true;
    }
    this.cdr.detectChanges();
  }
  // Marca el hito como aprobado
  async marcarCompletado() {
    const i = this.hitoACompletar!;
    this.mostrarModalCompletar = false;

    try {
      await firstValueFrom(this.seg.updateCampo({
        alumno_id:    Number(this.alumno.alumno_id),
        plan:         this.alumno.plan ?? '0',
        practica_num: this.practicaNum,
        campo:        this.hitos[i].key,
        valor:        2
      }));
      this.mensajeGlobal = '✅ Hito completado';
      this.cargarAlumnoActual();
      setTimeout(() => this.mensajeGlobal = null, 2000);
    } catch {
      this.mensajeGlobal = '❌ Error al completar el hito';
    }
  }
  // Guarda datos del hito 6 y marca como completado
  async completarHito6() {
    if (!this.envioreg_fecha_envio || !this.practica_anio_aprobacion || !this.practica_semestre_aprobacion) {
      this.mensajeGlobal = '🚫 Completa todos los campos';
      return;
    }

    try {
      await Promise.all([
        firstValueFrom(this.seg.updateCampo({
          alumno_id: Number(this.alumno.alumno_id),
          plan: this.alumno.plan ?? '0',
          practica_num: this.practicaNum,
          campo: 'envioreg_fecha_envio',
          valor: this.envioreg_fecha_envio
        })),
        firstValueFrom(this.seg.updateCampo({
          alumno_id: Number(this.alumno.alumno_id),
          plan: this.alumno.plan ?? '0',
          practica_num: this.practicaNum,
          campo: 'practica_anio_aprobacion',
          valor: this.practica_anio_aprobacion
        })),
        firstValueFrom(this.seg.updateCampo({
          alumno_id: Number(this.alumno.alumno_id),
          plan: this.alumno.plan ?? '0',
          practica_num: this.practicaNum,
          campo: 'practica_semestre_aprobacion',
          valor: this.practica_semestre_aprobacion
        })),
        firstValueFrom(this.seg.updateCampo({
          alumno_id: Number(this.alumno.alumno_id),
          plan: this.alumno.plan ?? '0',
          practica_num: this.practicaNum,
          campo: this.hitos[5].key,
          valor: 2
        }))
      ]);

      this.mostrarModalHito6 = false;
      this.mensajeGlobal = '✅ Práctica completada';
      this.cargarAlumnoActual();
      setTimeout(() => this.mensajeGlobal = null, 2000);
    } catch {
      this.mensajeGlobal = '❌ Error al completar';
    }
  }
  // Subir acta firmada
  onArchivoActaFirmada(event: any) {
    this.archivoActaFirmada = event.target.files[0] ?? null;
  }

  subirActaFirmada() {
    if (!this.archivoActaFirmada) {
      this.mensajeGlobal = '🚫 Selecciona un archivo PDF primero.';
      return;
    }
    this.subiendoActaFirmada = true;
    const fd = new FormData();
    fd.append('accion', 'subir_acta_firmada');
    fd.append('seguimiento_id', String(this.alumno.seguimiento_id));
    fd.append('alumno_id', String(this.alumno.alumno_id));
    fd.append('plan', this.alumno.plan ?? '0');
    fd.append('practica_num', String(this.practicaNum));
    fd.append('acta', this.archivoActaFirmada);

    this.seg.subirActaFirmada(fd).pipe(
      finalize(() => {
        this.subiendoActaFirmada = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.mensajeGlobal = '✅ Acta firmada subida correctamente';
        this.alumno.acta_firmada = res.ruta;
        this.archivoActaFirmada = null;
        setTimeout(() => this.mensajeGlobal = null, 2000);
      },
      error: () => {
        this.mensajeGlobal = '❌ Error al subir el acta firmada.';
      }
    });
  }
  async completarConFechaEntrega() {
    const i = this.hitoEntrega!;
    if (!this.fechaEntregaInput) {
      this.mensajeGlobal = '🚫 Ingresa la fecha de entrega';
      return;
    }

    const campofecha = this.fechaEntregaCampos[i];

    try {
      await Promise.all([
        firstValueFrom(this.seg.updateCampo({
          alumno_id:    Number(this.alumno.alumno_id),
          plan:         this.alumno.plan ?? '0',
          practica_num: this.practicaNum,
          campo:        this.hitos[i].key,
          valor:        2
        })),
        firstValueFrom(this.seg.updateCampo({
          alumno_id:    Number(this.alumno.alumno_id),
          plan:         this.alumno.plan ?? '0',
          practica_num: this.practicaNum,
          campo:        campofecha,
          valor:        this.fechaEntregaInput
        }))
      ]);

      this.mostrarModalFechaEntrega = false;
      this.mensajeGlobal = '✅ Hito completado con fecha de entrega';
      this.cargarAlumnoActual();
      setTimeout(() => this.mensajeGlobal = null, 2000);
    } catch {
      this.mensajeGlobal = '❌ Error al completar';
    }
  }
  generarFormularioRevision() {
    if (!this.alumno?.seguimiento_id) return;
    this.generandoFormulario = true;
    this.seg.generarFormularioRevision(this.alumno.seguimiento_id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `Formulario_Revision_${this.alumno.seguimiento_id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.generandoFormulario = false;
        this.alumno.informe_rev_formulario = `uploads/formularios_revision/formulario_revision_${this.alumno.seguimiento_id}.pdf`;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajeGlobal = '❌ Error al generar el formulario';
        this.generandoFormulario = false;
      }
    });
  }

  generarInformeConfidencial() {
    if (!this.alumno?.seguimiento_id) return;
    this.generandoInformeConf = true;
    this.seg.generarInformeConfidencial(this.alumno.seguimiento_id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `InformeConfidencial_${this.alumno.seguimiento_id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.generandoInformeConf = false;
        this.alumno.eval_empresa_archivo = `uploads/evaluaciones/informe_confidencial_${this.alumno.seguimiento_id}.pdf`;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajeGlobal = '❌ Error al generar el informe confidencial';
        this.generandoInformeConf = false;
      }
    });
  }

  // generar carta de solicitud
  generarCarta() {
    if (!this.alumno?.seguimiento_id) return;
    this.generandoCarta = true;
    this.seg.generarCartaSolicitud(this.alumno.seguimiento_id).subscribe({
      next: (res) => {
        this.cartaSolicitudUrl = 'http://localhost/' + res.ruta;
        this.alumno.carta_solicitud = res.ruta;
        this.generandoCarta = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mensajeGlobal = '❌ Error al generar la carta';
        this.generandoCarta = false;
      }
    });
  }

  calcularHorasTotales(i: number) {
    if (i !== 0) return;
    const inicio = this.tempDatos[0]?.fechaInicio;
    const termino = this.tempDatos[0]?.fechaTermino;
    const horasSem = Number(this.tempDatos[0]?.horasSem ?? 0);

    if (!inicio || !termino || horasSem <= 0) {
      this.tempDatos[0].horasTot = 0;
      return;
    }

    const d1 = new Date(inicio);
    const d2 = new Date(termino);
    const dias = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    const semanas = dias / 7;
    const horas = Math.round(semanas * horasSem);

    this.tempDatos[0].horasTot = horas;
    this.horasCalculadas = `${horas} horas de práctica`;
    this.cdr.detectChanges();
  }

  horasTotalesInsuficientes(): boolean {
    const horas = Number(this.tempDatos[0]?.horasTot ?? 0);
    if (horas <= 0) return false;
    const minimo = this.practicaNum === 1 ? 180 : 320;
    return horas < minimo;
  }
}
