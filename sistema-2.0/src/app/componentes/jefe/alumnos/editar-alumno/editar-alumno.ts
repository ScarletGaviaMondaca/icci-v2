import { Component } from '@angular/core';
import { OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlumnoService } from '../../../../servicios/alumno.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../../servicios/auth.service';

@Component({
  selector: 'app-editar-alumno',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-alumno.html',
  styleUrls: ['./editar-alumno.css'],
})
export class EditarAlumno implements OnInit, OnDestroy {

  alumno: any = null;
  originalAlumno: any = null; // Clon del alumno tal como vino de la BD

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alumnoService: AlumnoService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService  
  ) {}

 ngOnInit(): void {
    window.addEventListener('beforeunload', this.confirmarCierre); // <--- ¡Siempre agregar!
    // Si hay id en URL úsalo, si no toma el del token
    const idUrl = this.route.snapshot.paramMap.get('id');
    const id = idUrl ? Number(idUrl) : this.auth.getUsuario()?.alumno_id;
    if (id) {
      this.alumnoService.getAlumno(Number(id)).subscribe({
        next: (data) =>{
          this.alumno = data;
          this.originalAlumno = JSON.parse(JSON.stringify(data)); // Clon profundo para comparar cambios
          this.cdr.detectChanges();
        },          
        error: (err) => {
          console.error('ERROR AL CARGAR ALUMNO:', err);
          alert("Error al cargar alumno");
        }
      });
    }
  }
  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.confirmarCierre);
  }
  

  confirmarCierre = (event: BeforeUnloadEvent) => {
    const hayCambios = this.hayCambiosNoGuardados();
    console.log('¿Cambios no guardados? ', hayCambios);
    if (hayCambios) {
      event.preventDefault();
      event.returnValue = ''; // Requerido por algunos navegadores
    }
  };

  hayCambiosNoGuardados(): boolean {
    // Si aun no cargó el original, no bloquees
    if (!this.alumno || !this.originalAlumno) return false;
    // Compara alumno actual VS original (deep)
    return JSON.stringify(this.alumno) !== JSON.stringify(this.originalAlumno);
  }

  guardar() {
      this.alumnoService.actualizarAlumno(this.alumno).subscribe({
        next: () => {
          alert("Alumno actualizado");
           // Redirige según rol
          if (this.auth.esAlumno()) {
            this.router.navigate(['/alumno/perfil']);
          } else {
            this.router.navigate(['/lista-alumnos/ver-alumno', this.alumno.id]);
          }
        },
        error: (err) => {
          console.error('ERROR EN GUARDAR:', err);
          alert("Error al guardar cambios: " + (err.error?.error || err.message || 'Error desconocido'));
        }
      });
  }
  volver() {  
    if (this.auth.esAlumno()) {
        this.router.navigate(['/alumno/perfil']);
      } else {
        this.router.navigate(['/lista-alumnos']);
      }
  }

}
