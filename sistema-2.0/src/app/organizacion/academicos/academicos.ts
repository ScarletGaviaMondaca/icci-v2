import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';
import { ProfesoresService } from '../../servicios/profesores.service';



@Component({
  selector: 'app-academicos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './academicos.html',
  styleUrls: ['./academicos.css']
})
export class Academicos implements OnInit {

  constructor(
    public  auth: AuthService,
    private profSvc: ProfesoresService,
    private cdr:  ChangeDetectorRef,
    private zone: NgZone
  ) {}
  profesores: any[] = [];  
  cambiandoId: number|null = null;
  loading = true;
  error = '';

  ngOnInit() {
    this.profSvc.listar().subscribe({
      next: (data) => {
        // Asegúrate de que 'activo' sea booleano
        this.profesores = data.map(p => ({
          ...p,
          activo: String(p.activo) === '1' || p.activo === 1 || p.activo === true, // transforma activo en booleano
          nombreCompleto: [p.nombre, p.apellido1, p.apellido2].filter(Boolean).join(' '),
          ruta_foto: p.foto && p.foto !== 'null' ? p.foto: ''
        }));
        this.cdr.detectChanges(); 
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudo cargar la lista de profesores :(';
        this.loading = false;
      }
    });
  }

  get activos() {
    return this.profesores.filter(p => p.activo);
  }
  get inactivos() {
    return this.profesores.filter(p => !p.activo);
  }

  toggleActivo(persona: any) {
    if (this.cambiandoId) return; // evita doble click rápido
    this.cambiandoId = persona.id;
    this.profSvc.toggleActivo(persona.id).subscribe({
      next: () => {
        persona.activo = !persona.activo; // cambia el estado local
        this.cambiandoId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cambiandoId = null;
        alert('Ocurrió un error al cambiar el estado');
      }
    });
  }
}