import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth.service';
import { FormsModule } from '@angular/forms';
import { MapaService } from '../../servicios/mapa.service';
import { ChangeDetectorRef } from '@angular/core';

export interface BuildingContact {
  phone?: string;
  web?: string;
  address?: string;
  hours?: string;
  email?: string;
}

export interface Building {
  id: string;
  label: string;
  type: 'principal' | 'facultad' | 'admin' | 'servicio' | 'aula' | 'auditorio' | 'otro';
  x: number;
  y: number;
  name: string;
  desc: string;
  contact: BuildingContact;
}

export interface BuildingGroup {
  type: string;
  label: string;
  color: string;
  buildings: Building[];
}

export const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  principal: { label: 'Edificio principal', color: '#185FA5' },
  facultad:  { label: 'Facultad / Departamento', color: '#3B6D11' },
  admin:     { label: 'Administración', color: '#854F0B' },
  servicio:  { label: 'Servicio estudiantil', color: '#993C1D' },
  aula:      { label: 'Salas de clases', color: '#534AB7' },
  auditorio: { label: 'Auditorio', color: '#3C3489' },
  otro:      { label: 'Organización', color: '#5F5E5A' },
};

@Component({
  selector: 'app-mapa',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './mapa.html',
  styleUrls: ['./mapa.css'],
})
export class Mapa implements OnInit {

  buildings: Building[] = [];          // ← ya no tiene el array hardcodeado
  isLoading = true;                    // ← para mostrar un spinner mientras carga
  typeConfig = TYPE_CONFIG;
  legendEntries = Object.entries(TYPE_CONFIG);
  selectedBuilding: Building | null = null;
  panelVisible = false;
  groupedBuildings: BuildingGroup[] = [];
  isAdmin = false;
  modalActualizacionAbierto = false;
  // para agregar un nuevo edificio
  modoAgregar = false;
  modalNuevoEdificio = false;
  nuevoEdificio: Partial<Building> = {};

  constructor(
    private auth: AuthService,
    private mapaService: MapaService,
    private cdr: ChangeDetectorRef
  ) {}

ngOnInit(): void {
  this.isAdmin = this.auth.esAdmin();

  this.mapaService.getAll().subscribe({
    next: (data) => {
      this.buildings = data;
      this.groupedBuildings = this.buildGroups();
      this.isLoading = false;
      this.cdr.detectChanges(); 
    },
    error: (err) => {
      console.error('❌ Error:', err);
    }
  });
}

  // ── Modal ──────────────────────────────────────────────

  abrirModalActualizar() {
    this.modalActualizacionAbierto = true;
  }

  cerrarModalActualizar() {
    this.modalActualizacionAbierto = false;
  }

  guardarActualizacion() {
    if (!this.selectedBuilding) return;

    // ← NUEVO: guarda en la base de datos en vez de solo cerrar
    this.mapaService.update(this.selectedBuilding.id, this.selectedBuilding).subscribe({
      next: () => {
        this.groupedBuildings = this.buildGroups();
        this.cerrarModalActualizar();
        this.cdr.detectChanges();
        alert('Cambios guardados correctamente');
      },
      error: (err) => {
        console.error('Error guardando:', err);
        alert('Error al guardar los cambios');
      }
    });
  }
  // ── Agrupación ─────────────────────────────────────────
  private buildGroups(): BuildingGroup[] {
    const order = ['principal', 'facultad', 'admin', 'servicio', 'aula', 'auditorio', 'otro'];
    const seen = new Set<string>();
    const unique = this.buildings.filter(b => {
      const key = b.label + b.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return order
      .filter(type => unique.some(b => b.type === type))
      .map(type => ({
        type,
        label: this.typeConfig[type].label,
        color: this.typeConfig[type].color,
        buildings: unique
          .filter(b => b.type === type)
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      }));
  }
  // ── Helpers ────────────────────────────────────────────
  getTypeColor(type: string): string {
    return this.typeConfig[type]?.color ?? '#888';
  }
  getTypeLabel(type: string): string {
    return this.typeConfig[type]?.label ?? type;
  }
  // ── Interacción con el mapa ────────────────────────────
  onPinClick(building: Building, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedBuilding = building;
    this.panelVisible = true;
  }
  onListClick(building: Building): void {
    const match = this.buildings.find(
      b => b.label === building.label && b.name === building.name
    );
    if (match) {
      this.selectedBuilding = match;
      this.panelVisible = true;
      const mapEl = document.querySelector('.map-container');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  closePanel(): void {
    this.panelVisible = false;
    this.selectedBuilding = null;
  }
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanel();
  }

  // Activa/desactiva el modo agregar
  toggleModoAgregar(): void {
    this.modoAgregar = !this.modoAgregar;
  }

  // Captura el clic en el mapa
  onMapClick(event: MouseEvent): void {
    if (!this.modoAgregar) return;

    const img = event.currentTarget as HTMLElement;
    const rect = img.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width)  * 100;
    const y = ((event.clientY - rect.top)  / rect.height) * 100;

    this.nuevoEdificio = {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      type: 'facultad',
      contact: {}
    };

    this.modalNuevoEdificio = true;
    this.modoAgregar = false;
  }

  cerrarModalNuevo(): void {
    this.modalNuevoEdificio = false;
    this.nuevoEdificio = {};
  }

  guardarNuevoEdificio(): void {
    if (!this.nuevoEdificio.id || !this.nuevoEdificio.name) {
      alert('El ID y el nombre son obligatorios');
      return;
    }

    this.mapaService.create(this.nuevoEdificio as Building).subscribe({
      next: () => {
        this.mapaService.getAll().subscribe(data => {
          this.buildings = data;
          this.groupedBuildings = this.buildGroups();
        });
        this.cerrarModalNuevo();
        alert('Edificio agregado correctamente');
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert('Error al guardar el edificio');
      }
    });
  }
}