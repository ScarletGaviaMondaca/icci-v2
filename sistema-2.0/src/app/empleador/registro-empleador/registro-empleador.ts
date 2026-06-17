import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OfertasService } from '../../servicios/ofertas.service';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-registro-empleador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-empleador.html',
  styleUrl: './registro-empleador.css'
})
export class RegistroEmpleador implements OnInit {
  token = '';
  correoToken = '';
  tokenValido = false;
  tokenError = '';
  cargando = false;
  registrado = false;
  mensaje = '';
  error = '';
  compromisoUrl: string | null = null;
  compromisoUrlSafe: SafeResourceUrl | null = null;
  aceptaCompromiso = false;

  empresas: any[] = [];
  form = {
    token: '',
    empresa_id: 0,
    nombres: '',
    apellido1: '',
    apellido2: '',
    cargo: '',
    correo: '',
    telefono: '',
    password: '',
    confirmar_password: ''
  };
  mostrarNuevaEmpresa = false;
  nuevaEmpresaNombre = '';
  creandoEmpresa = false;
  verPassword = false;
  verConfirmar = false  

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private svc: OfertasService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] ?? '';
    if (this.token) this.validarToken();
    this.cargarEmpresas();
    this.cargarCompromiso();
    this.cdr.detectChanges();
  }

  cargarCompromiso() {
    this.svc.getCompromiso().subscribe({
      next: (res) => {
        this.compromisoUrl = res.url;
        if (res.url) {
          this.compromisoUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  validarToken() {
    this.cargando = true;
    this.svc.validarToken(this.token).subscribe({
      next: (res) => {
        this.tokenValido = true;
        this.correoToken = res.correo;
        this.form.token = this.token;
        this.form.correo = res.correo;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.tokenError = 'Token inválido o ya utilizado.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
  cargarEmpresas() {
    this.svc.listarEmpresasPublico().subscribe({
      next: (e) => this.empresas = e,
      error: () => {}
    });
  }
  registrar() {
    if (!this.passwordValida) {
      this.error = 'La contraseña no cumple los requisitos';
      return;
    }
    if (this.form.password !== this.form.confirmar_password) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    this.cargando = true;
    this.error = '';
    this.svc.registrarEmpleador(this.form).subscribe({
      next: (res) => {
        // Login automático
        this.auth.login(res.username, this.form.password).subscribe({
          next: () => {
            this.cargando = false;
            this.router.navigate(['/empleador']);
          },
          error: () => {
            // Si falla auto-login muestra mensaje y va al login
            this.registrado = true;
            this.mensaje = `✅ Cuenta creada. Tu usuario es: ${res.username}`;
            this.cargando = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.error = err.error?.error ?? '❌ Error al registrar';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
  crearEmpresa() {
    if (!this.nuevaEmpresaNombre.trim()) return;
    this.creandoEmpresa = true;
    this.svc.crearEmpresaPublico(this.nuevaEmpresaNombre.trim()).subscribe({
      next: (res) => {
        this.empresas = [...this.empresas, { id: res.id, nombre: res.nombre }];
        this.form.empresa_id = res.id;
        this.mostrarNuevaEmpresa = false;
        this.nuevaEmpresaNombre = '';
        this.creandoEmpresa = false;
      },
      error: (err) => {
        this.error = err.error?.error ?? '❌ Error al crear empresa';
        this.creandoEmpresa = false;
      }
    });
  }
  validarPassword(pass: string): string[] {
    const errores = [];
    if (pass.length < 8) errores.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(pass)) errores.push('Al menos una mayúscula');
    if (!/[0-9]/.test(pass)) errores.push('Al menos un número');
    if (!/[@#$%^&*!]/.test(pass)) errores.push('Al menos un carácter especial (@#$%^&*!)');
    return errores;
  }
  get erroresPassword(): string[] {
    return this.validarPassword(this.form.password);
  }
  get passwordValida(): boolean {
    return this.erroresPassword.length === 0;
  }
}