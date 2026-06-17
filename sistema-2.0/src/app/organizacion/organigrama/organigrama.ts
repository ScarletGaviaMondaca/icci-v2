import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { OrganigramaService } from '../../servicios/organigrama.service'; // Asegúrate de que la ruta sea correcta
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../servicios/auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-organigrama',
  imports: [CommonModule, FormsModule],
  templateUrl: './organigrama.html',
  styleUrls: ['./organigrama.css'], 
  })
export class Organigrama implements OnInit {
  lista: any[] = [];
  mostrarFormulario: boolean = false;
  personaEnEdicion: any = null;
  archivoEditar: File | null = null;

    // Objeto vacío para el nuevo integrante
  nuevo: any = {
    nombre: '',
    rol: '',
    correo: '',
    lugar: '',
    telefono: '',
    dpto: '',
    perfil_url: '',
    especialidad: ''
  };

  onRolChange() {
    if (this.nuevo.rol !== 'Ingeniero') {
      this.nuevo.especialidad = '';
    }
  }
  //Para el orden de las tarjetas
  directivos: any[] = [];
  jefesSecundarios: any[] = [];
  secretarias: any[] = [];
  docentes: any[] = []; 
  //para que queden solo 2 por fila 
  filasSecretarias: any[][] = [];
  filasDocentes: any[][] = []; 


  toggleFormulario() {
    this.mostrarFormulario = !this.mostrarFormulario;
  }

  constructor(private api: OrganigramaService, 
              private cd: ChangeDetectorRef,
              private route: ActivatedRoute,
              public auth: AuthService) {}

  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.api.getMiembros().subscribe({
      next: (data: any[]) => {

        this.lista = [...data]; // nueva referencia
        this.ordenarLista(); // Ordena después de asignar
        this.clasificarPorNivel(); // Clasifica después de ordenar
        this.dividirSecretariasEnFilas();
        this.dividirDocentesEnFilas();
        this.cd.detectChanges(); //  FUERZA RENDER

      },
      error: (err) => console.error('Error al traer datos:', err)
    });
  }
 crearNuevo(inputFoto: any) {
  // Validamos que exista una foto antes de enviar
    if (!inputFoto.files || inputFoto.files.length === 0) {
      alert("❌ Debes seleccionar una foto antes de guardar.");
      return; 
    }
    // Determinar el rol final a guardar
    let rolFinal = this.nuevo.rol;
    if (this.nuevo.rol === 'Ingeniero' && this.nuevo.especialidad) {
      rolFinal = `Ingeniero de ${this.nuevo.especialidad}`;
    }
    if (this.nuevo.rol === 'otro') {
      rolFinal = '';
    }

    // recopilamos los datos 
    const fd = new FormData();
    fd.append('accion', 'crear');
    fd.append('nombre', this.nuevo.nombre);
    fd.append('rol', rolFinal);
    fd.append('dpto', this.nuevo.dpto || '');
    fd.append('correo', this.nuevo.correo);
    fd.append('lugar', this.nuevo.lugar);
    fd.append('telefono', this.nuevo.telefono || '');
    fd.append('perfil_url', this.nuevo.perfil_url || '');
    fd.append('foto', inputFoto.files[0]);
    
    this.api.actualizarMiembro(fd).subscribe({
      next: (res) => {
        alert("✅ ¡Guardado con éxito!");
        this.nuevo = { nombre: '', rol: '', correo: '', lugar: '', telefono: '', dpto: '', perfil_url: '', especialidad: '' };
        inputFoto.value = ""; 
        this.mostrarFormulario = false;
        this.cargar(); 
      },
      error: (err) => {
        alert("❌ Error de conexión con el servidor");
      }
    });
  }
  abrirFormularioEdicion(persona: any) {
    // Hacer copia para no modificar directamente la lista antes de guardar
    this.personaEnEdicion = { ...persona };
    this.archivoEditar = null;
  }
  onFileEditarSeleccionado(files: FileList | null) {
    if (files && files.length > 0) {
      this.archivoEditar = files[0];
    } else {
      this.archivoEditar = null; // Si no hay archivos seleccionados
    }
  }
  guardarEdicion() {
    if (!this.personaEnEdicion) return;

    const fd = new FormData();
    fd.append('accion', 'editar');
    fd.append('id', this.personaEnEdicion.id);
    fd.append('nombre', this.personaEnEdicion.nombre);
    fd.append('correo', this.personaEnEdicion.correo);
    fd.append('lugar', this.personaEnEdicion.lugar);
    fd.append('dpto', this.personaEnEdicion.dpto);
    fd.append('telefono', this.personaEnEdicion.telefono || '');
    fd.append('perfil_url', this.personaEnEdicion.perfil_url || '');
    

    if (this.archivoEditar) {
      fd.append('foto', this.archivoEditar);
    }

    this.api.actualizarMiembro(fd).subscribe({
      next: (res) => {
        alert("✅ Datos actualizados con éxito");
        this.personaEnEdicion = null;
        this.archivoEditar = null;
        this.cargar();
      },
      error: (err) => {
        console.error("Error al guardar edición:", err);
        alert("❌ Error al guardar cambios");
      }
    });
  }
  cancelarEdicion() {
    this.personaEnEdicion = null;
    this.archivoEditar = null;
  }
  eliminar(persona: any) {
    const confirmar = confirm(`¿Eliminar a ${persona.nombre}?`);
    if (!confirmar) return;

    const fd = new FormData();
    fd.append('accion', 'eliminar');
    fd.append('id', persona.id);

    this.api.actualizarMiembro(fd).subscribe({
      next: (res) => {
        alert("🗑 Eliminado con éxito");
        // Elimina directamente del array para actualizar UI
        this.lista = this.lista.filter(x => x.id !== persona.id);
        this.ordenarLista(); // Reordena después de eliminar
        this.clasificarPorNivel(); // Reclasifica después de eliminar
        this.dividirSecretariasEnFilas();
        this.dividirDocentesEnFilas();
        this.cd.detectChanges(); 
      },
      error: (err) => {
        console.error("Error al eliminar:", err);
        alert("❌ No se pudo eliminar");
      }
    });
  }
  // Para el orden de los datos en el organigrama
  ordenarLista() {
    const prioridad: { [key: string]: number } = {
      'Director Departamento DICI': 1,
      'Jefe de Carrera ICCI': 2,
      'Jefe de Carrera ICD': 3,
      'Secretaria del Departamento DICI': 4,
      'Secretaria de la Carrera ICCI': 5,
      'Secretaria de la Carrera ICD': 6,
      'Profesional de apoyo': 7
    };

    this.lista.sort((a, b) => {
      const keyA = `${a.rol} ${a.dpto}`;
      const keyB = `${b.rol} ${b.dpto}`;

      const pA = prioridad[keyA] ?? 99;
      const pB = prioridad[keyB] ?? 99;

      return pA - pB;
    });
  }

  clasificarPorNivel() {
    this.directivos = [];
    this.jefesSecundarios = [];
    this.secretarias = [];
    this.docentes = [];

    for (const p of this.lista) {
      if (p.rol === 'Director Departamento') {
        this.directivos.push(p);
      } else if (p.rol === 'Jefe de Carrera' && p.dpto === 'ICCI') {
        this.directivos.push(p);
      } else if (p.rol === 'Jefe de Carrera') {
        this.jefesSecundarios.push(p);
      } else if (p.rol?.includes('Secretaria')) { // ← cambio aquí
        this.secretarias.push(p);
      } else {
        this.docentes.push(p);
      }

    }
  }

  dividirSecretariasEnFilas() {
    this.filasSecretarias = [];

    for (let i = 0; i < this.secretarias.length; i += 2) {
      this.filasSecretarias.push(this.secretarias.slice(i, i + 2));
    }
  }

dividirDocentesEnFilas() {
    this.filasDocentes = [];

    for (let i = 0; i < this.docentes.length; i += 2) {
      this.filasDocentes.push(this.docentes.slice(i, i + 2));
    }
  }
}