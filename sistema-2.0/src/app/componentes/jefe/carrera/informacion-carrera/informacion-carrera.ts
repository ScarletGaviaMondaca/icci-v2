import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { InfoCarrera, InfoService } from '../../../../servicios/info.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../servicios/auth.service';

@Component({
  selector: 'app-informacion-carrera',
  imports: [CommonModule, FormsModule],
  templateUrl: './informacion-carrera.html',
  styleUrl: './informacion-carrera.css',
})
export class InformacionCarrera implements OnInit {
carrera: InfoCarrera | undefined;
  editarCarrera: InfoCarrera | undefined; // Backup para el modal
  mostrarModal = false;

  constructor(
    private infoService: InfoService,
    private cdr: ChangeDetectorRef,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.infoService.getInfoCarrera().subscribe(data => {
      this.carrera = data;
      this.cdr.detectChanges();
    });
  }

  abrirModalEditar() {
    this.editarCarrera = { ...this.carrera! }; // Clona los datos para editar sin afectar los mostrados
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.editarCarrera = undefined;
  }

  guardarCambios() {
    if (this.editarCarrera) {
      this.infoService.updateInfoCarrera(this.editarCarrera).subscribe(resp => {
        if (resp.success) {
          this.cerrarModal();
          this.cargarDatos(); // Refresca los datos para mostrar info actualizada
        } else {
          alert('Error al actualizar');
        }
      });
    }
  }
  obtenerLineas(texto: string | undefined): string[] {
    if (!texto) return [];
    return texto
      .split(/\r?\n|>\s?/)                   // divide por nueva línea o ">"
      .map(linea => linea.trim())            // quita espacios
      .filter(linea => linea.length > 0);    // quita vacías
  }
}
