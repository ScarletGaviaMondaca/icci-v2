import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlumnoService } from '../../../../servicios/alumno.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../servicios/auth.service';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../../../servicios/usuarios.service';

@Component({
  selector: 'app-ver-alumno',
  imports: [CommonModule, FormsModule],
  templateUrl: './ver-alumno.html',
  styleUrl: './ver-alumno.css',
})
export class VerAlumno {
  alumno: any;
  mostrarCambioPass = false;
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';
  mensajePass: string | null = null;
  errorPass: string | null = null;
  verActual = false;
  verNueva = false;
  verConfirmar = false;

  constructor(
    private route: ActivatedRoute,
    private alumnoService: AlumnoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public auth: AuthService,
    private usuariosSvc: UsuariosService
  ) {}

  ngOnInit() {

    // Si hay id en la URL úsalo, si no toma el del token (alumno logueado)
    const idUrl = this.route.snapshot.paramMap.get('id');
    const id = idUrl ? Number(idUrl) : this.auth.getUsuario()?.alumno_id;
    this.alumnoService.getAlumno(Number(id)).subscribe({
      next: (data) => {
        this.alumno = data;
        this.cdr.detectChanges();
      }
    });
  }
  
   editar() {
    if (this.auth.esAlumno()) {
      this.router.navigate(['/alumno/editar-perfil']);
    } else {
      this.router.navigate(['/jefe/listado-alumnos/editar-alumno', this.alumno.id]);
    }
  }
 
  validarPassword(password: string): string | null {
    if (password.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'Debe tener al menos una mayúscula';
    if (!/[a-z]/.test(password)) return 'Debe tener al menos una minúscula';
    if (!/[0-9]/.test(password)) return 'Debe tener al menos un número';
    return null;
  }
  cambiarPassword() {
    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      this.errorPass = 'Completa todos los campos';
      return;
    }
    if (this.passwordNueva !== this.passwordConfirmar) {
      this.errorPass = 'Las contraseñas no coinciden';
      return;
    }
    const errorValidacion = this.validarPassword(this.passwordNueva);
    if (errorValidacion) {
      this.errorPass = errorValidacion;
      return;
    }
    this.usuariosSvc.cambiarMiPassword(this.passwordActual, this.passwordNueva).subscribe({
      next: () => {
        this.mensajePass = '✅ Contraseña actualizada';
        this.passwordActual = '';
        this.passwordNueva = '';
        this.passwordConfirmar = '';
        this.mostrarCambioPass = false;
        this.cdr.detectChanges();
        setTimeout(() => this.mensajePass = null, 3000);
      },
      error: (err) => {
        this.errorPass = err.error?.error ?? '❌ Error al cambiar contraseña';
        setTimeout(() => this.errorPass = null, 3000);
      }
    });
  }
}
