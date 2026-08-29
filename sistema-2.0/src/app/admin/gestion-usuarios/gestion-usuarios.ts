import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../servicios/usuarios.service';
import { OfertasService } from '../../servicios/ofertas.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-gestion-usuarios',
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-usuarios.html',
  styleUrls: ['./gestion-usuarios.css']
})
export class GestionUsuarios implements OnInit {
  usuarios: any[] = [];
  profesoresSinUsuario: any[] = [];
  mensaje: string | null = null;
  error: string | null = null;

  // Formulario nuevo usuario
  mostrarForm = false;
  nuevoUsuario = { username: '', password: '', rol: 'secretaria' };
  creando = false;
  // Formulario editar usuario
  mostrarEditar = false;
  editando      = false;
  editForm = { id: 0, username: '', rol: 'secretaria', nombre: '', apellido1: '', apellido2: '', correo: '' };
  // Cambiar contraseña
  usuarioCambiandoPass: number | null = null;
  nuevaPassword = '';
  creandoAlumnos = false;
  //Crear usuario profesor
  mostrarFormProfesor = false;
  creandoProfesor     = false;
  formProfesor = { profesor_id: 0, username: '', password: '', rol: 'profesor' };
  // Buscar alumno para cambiar contraseña
  busquedaRut = '';
  alumnoEncontrado: any = null;
  buscandoAlumno = false;
  nuevaPasswordAlumno = '';
  cambiandoPasswordAlumno = false;
  mostrarModalPasswordAlumno = false;
  // token para empresas
  mostrarModalToken = false;
  correoToken = '';
  tokenGenerado = '';
  generandoToken = false;
  // documento de compromiso
  mostrarModalCompromiso = false;
  compromisoArchivo: File | null = null;
  subiendoCompromiso = false;
  compromisoInfo: { existe: boolean; url: string | null } | null = null;

  constructor(
    private http: HttpClient,
    private svc: UsuariosService,
    private ofertasSvc: OfertasService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
    ) {}

  togglingJefeCarrera: number | null = null;
  togglingDirector: number | null = null;

  get usuariosStaff() {
    return this.usuarios.filter(u =>
      ['admin', 'secretaria', 'secretaria_dici'].includes(u.rol) ||
      (u.rol === 'jefe_carrera' && !u.profesor_id) ||
      (u.rol === 'director_departamento' && !u.profesor_id)
    );
  }
  get usuariosProfesores() {
    return this.usuarios.filter(u => u.profesor_id != null);
  }
  get usuariosEmpleadores() {
    return this.usuarios.filter(u => u.rol === 'empleador');
  }

  nombreCompleto(u: any): string {
    const p = u.profesor;
    if (p?.nombre) return `${p.apellido1 ?? ''} ${p.apellido2 ?? ''}, ${p.nombre}`.trim();
    if (u.nombre)  return `${u.apellido1 ?? ''} ${u.apellido2 ?? ''}, ${u.nombre}`.trim();
    return '—';
  }

  toggleJefeCarrera(u: any) {
    const nuevoRol = u.rol === 'jefe_carrera' ? 'profesor' : 'jefe_carrera';
    const accion   = nuevoRol === 'jefe_carrera' ? 'asignar como Jefe de Carrera' : 'quitar como Jefe de Carrera';
    if (!confirm(`¿${accion} a ${this.nombreCompleto(u)}?`)) return;
    this.togglingJefeCarrera = u.id;
    this.svc.cambiarRol(u.id, nuevoRol).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mostrarMensaje(`✅ Rol actualizado a ${nuevoRol}`);
          this.togglingJefeCarrera = null;
          this.cdr.detectChanges();
          this.cargar();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.mostrarError('❌ Error al cambiar rol');
          this.togglingJefeCarrera = null;
          this.cdr.detectChanges();
        });
      }
    });
  }

  toggleDirectorDepartamento(u: any) {
    const nuevoRol = u.rol === 'director_departamento' ? 'profesor' : 'director_departamento';
    const accion   = nuevoRol === 'director_departamento' ? 'asignar como Director de Departamento' : 'quitar como Director de Departamento';
    if (!confirm(`¿${accion} a ${this.nombreCompleto(u)}?`)) return;
    this.togglingDirector = u.id;
    this.svc.cambiarRol(u.id, nuevoRol).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mostrarMensaje(`✅ Rol actualizado a ${nuevoRol}`);
          this.togglingDirector = null;
          this.cdr.detectChanges();
          this.cargar();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.mostrarError('❌ Error al cambiar rol');
          this.togglingDirector = null;
          this.cdr.detectChanges();
        });
      }
    });
  }

  ngOnInit() {
    this.cargar();
    this.cargarProfesoresSinUsuario();
    this.cargarCompromisoInfo();
  }
  cargar() {
    this.svc.listar().subscribe({
      next: (u) =>{
        this.zone.run(() => {
          this.usuarios = u;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.mostrarError('Error al cargar usuarios');
      }
    });
    
  }
  cargarProfesoresSinUsuario() {
    this.svc.getProfesoresSinUsuario().subscribe({
      next: (profesores) => {
        this.profesoresSinUsuario = profesores;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mostrarError('Error al cargar profesores sin usuario');
      }
    });
  }
  crear() {
    if (!this.nuevoUsuario.username || !this.nuevoUsuario.password) {
      this.mostrarError('Completa todos los campos');
      return;
    }
    this.creando = true;
    this.svc.crear(this.nuevoUsuario).subscribe({
      next: () => {
        this.zone.run(() => {
          this.mostrarMensaje('✅ Usuario creado correctamente');
          this.nuevoUsuario = { username: '', password: '', rol: 'secretaria' };
          this.mostrarForm = false;
          this.creando = false;
          this.cdr.detectChanges();
          this.cargar();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.mostrarError(err.error?.message ?? err.error?.error ?? '❌ Error al crear usuario');
          this.creando = false;
          this.cdr.detectChanges();
        });
      }
    });
  }
  toggleFormulario() {
    this.mostrarForm = !this.mostrarForm;
  }
  toggleActivo(usuario: any) {
    this.svc.toggleActivo(usuario.id).subscribe({
      next: () => {
        usuario.activo = usuario.activo == 1 ? 0 : 1;
        this.mostrarMensaje('✅ Estado actualizado');
      },
      error: () => this.mostrarError('❌ Error al actualizar estado')
    });
  }
  abrirEditar(usuario: any) {
  console.log('USUARIO:', usuario);
    this.zone.run(() => {
      this.editForm = {
        id:        usuario.id,
        username:  usuario.username,
        rol:       usuario.rol,
        nombre:    usuario.nombre    ?? '',
        apellido1: usuario.apellido1 ?? '',
        apellido2: usuario.apellido2 ?? '',
        correo:    usuario.correo    ?? ''
      };
      this.mostrarEditar = true;
    });
  }
  cerrarEditar() {
    this.zone.run(() => { this.mostrarEditar = false; });
  }
  guardarEdicion() {
    if (!this.editForm.username) {
      this.mostrarError('Completa todos los campos');
      return;
    }
    this.editando = true;
    this.svc.editar(this.editForm).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Usuario actualizado');
        this.editando = false;
        this.cargar();
        this.cerrarEditar();
      },
      error: (err) => {
        this.mostrarError(err.error?.error ?? '❌ Error al actualizar usuario');
        this.editando = false;
      }
    });
  }
  eliminar(id: number) {
    if (!confirm('¿Eliminar al usuario?')) return;
    this.svc.eliminar(id).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Usuario eliminado');
        this.cargar();
      },
      error: () => this.mostrarError('❌ Error al eliminar usuario')
    });
  }
  cambiarPassword(id: number) {
    if (!this.nuevaPassword || this.nuevaPassword.length < 6) {
      this.mostrarError('Mínimo 6 caracteres');
      return;
    }
    this.svc.cambiarPassword(id, this.nuevaPassword).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Contraseña actualizada');
        this.usuarioCambiandoPass = null;
        this.nuevaPassword = '';
      },
      error: () => this.mostrarError('❌ Error al cambiar contraseña')
    });
  }
  mostrarMensaje(msg: string) {
    this.mensaje = msg;
    this.error = null;
    setTimeout(() => this.mensaje = null, 3000);
  }
  mostrarError(msg: string) {
    this.error = msg;
    this.mensaje = null;
    setTimeout(() => this.error = null, 3000);
  }
  crearUsuariosAlumnos() {
    if (!confirm('¿Crear usuarios para todos los alumnos sin cuenta? El RUT será su usuario y contraseña inicial.')) return;
    
    this.creandoAlumnos = true;
    this.svc.crearUsuariosAlumnos().subscribe({
      next: (res) => {
        this.mostrarMensaje(`✅ ${res.mensaje}`);
        this.creandoAlumnos = false;
        this.cargar();
      },
      error: (err) => {
        this.mostrarError(err.error?.error ?? '❌ Error al crear usuarios');
        this.creandoAlumnos = false;
      }
    });
  }
  toggleFormProfesor() {
    this.mostrarFormProfesor = !this.mostrarFormProfesor;
    this.mostrarForm = false;
    this.formProfesor = { profesor_id: 0, username: '', password: '', rol: 'profesor' };
  }

  private limpiarTexto(s: string): string {
    return (s ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  onProfesorSeleccionado(profesorId: number) {
    const prof = this.profesoresSinUsuario.find(p => p.id === +profesorId);
    if (!prof) return;
    const inicial  = this.limpiarTexto(prof.nombre ?? '').charAt(0);
    const apellido = this.limpiarTexto(prof.apellido1 ?? '');
    this.formProfesor.username = inicial + apellido;
    const anio = prof.created_at
      ? new Date(prof.created_at).getFullYear()
      : new Date().getFullYear();
    this.formProfesor.password = `Icci.${anio}`;
  }
  crearUsuarioProfesor() {
    if (!this.formProfesor.profesor_id || !this.formProfesor.username || !this.formProfesor.password) {
      this.mostrarError('Selecciona un profesor, revisa el usuario y la contraseña'); return;
    }
    this.creandoProfesor = true;
    this.svc.crearProfesor(+this.formProfesor.profesor_id, this.formProfesor.password, this.formProfesor.rol, this.formProfesor.username)
      .subscribe({
        next: res => {
          this.zone.run(() => {
            this.mostrarMensaje(`✅ Usuario creado: ${res.username}`);
            this.formProfesor        = { profesor_id: 0, username: '', password: '', rol: 'profesor' };
            this.mostrarFormProfesor = false;
            this.creandoProfesor     = false;
            this.cdr.detectChanges();
            this.cargar();
            this.cargarProfesoresSinUsuario();
          });
        },
        error: err => {
          this.zone.run(() => {
            this.mostrarError(err.error?.message ?? err.error?.error ?? '❌ Error al crear');
            this.creandoProfesor = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  nombreProfesor(p: any): string {
    return `${p.apellido1} ${p.apellido2 ?? ''}, ${p.nombre}`.trim();
  }
  buscarAlumnoPorRut() {
    if (!this.busquedaRut.trim()) return;
    this.buscandoAlumno = true;
    this.alumnoEncontrado = null;
    this.svc.buscarAlumnoPorRut(this.busquedaRut.trim()).subscribe({
      next: (res) => {
        this.alumnoEncontrado = res;
        this.buscandoAlumno = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('❌ Alumno no encontrado');
        this.buscandoAlumno = false;
      }
    });
  }
  cambiarPasswordAlumno() {
    if (!this.nuevaPasswordAlumno || this.nuevaPasswordAlumno.length < 6) {
      this.mostrarError('Mínimo 6 caracteres');
      return;
    }
    if (!this.alumnoEncontrado?.usuario_id) {
      this.mostrarError('❌ Este alumno no tiene una cuenta de usuario creada');
      return;
    }
    this.cambiandoPasswordAlumno = true;
    this.svc.cambiarPassword(this.alumnoEncontrado.usuario_id, this.nuevaPasswordAlumno).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Contraseña actualizada correctamente');
        this.nuevaPasswordAlumno = '';
        this.alumnoEncontrado = null;
        this.busquedaRut = '';
        this.cambiandoPasswordAlumno = false;
        this.mostrarModalPasswordAlumno = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('❌ Error al cambiar contraseña');
        this.cambiandoPasswordAlumno = false;
      }
    });
  }
 //Token para empresas
 generarTokenEmpleador() {
    if (!this.correoToken.trim()) {
      this.mostrarError('Ingresa un correo');
      return;
    }
    this.generandoToken = true;
    this.svc.generarTokenEmpleador(this.correoToken).subscribe({
      next: (res) => {
        this.tokenGenerado = `http://localhost:4200/registro-empleador?token=${res.token}`;
        this.generandoToken = false;
        this.mostrarMensaje(`✅ Correo enviado a ${this.correoToken}`);
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('❌ Error al generar token');
        this.generandoToken = false;
        this.cdr.detectChanges();
      }
    });
  }
  copiarToken() {
    navigator.clipboard.writeText(this.tokenGenerado);
    this.mostrarMensaje('✅ Link copiado al portapapeles');
  }

  // ── Documento de compromiso ───────────────────────────────────────────────

  cargarCompromisoInfo() {
    this.ofertasSvc.getCompromiso().subscribe({
      next: (res) => { this.compromisoInfo = res; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  abrirModalCompromiso() {
    this.compromisoArchivo = null;
    this.cargarCompromisoInfo();
    this.mostrarModalCompromiso = true;
  }

  onArchivoCompromiso(event: Event) {
    const input = event.target as HTMLInputElement;
    this.compromisoArchivo = input.files?.[0] ?? null;
  }

  subirCompromiso() {
    if (!this.compromisoArchivo) return;
    this.subiendoCompromiso = true;
    this.ofertasSvc.subirCompromiso(this.compromisoArchivo).subscribe({
      next: () => {
        this.mostrarMensaje('✅ Documento subido correctamente');
        this.subiendoCompromiso = false;
        this.compromisoArchivo = null;
        this.mostrarModalCompromiso = false;
        this.cargarCompromisoInfo();
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarError('❌ Error al subir el documento');
        this.subiendoCompromiso = false;
        this.cdr.detectChanges();
      }
    });
  }

}