import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../servicios/auth.service';
import { CommonModule } from '@angular/common';
import { OfertasService } from '../../servicios/ofertas.service';

@Component({
  selector: 'app-vista-solicitud',
  imports: [CommonModule],
  templateUrl: './vista-solicitud.html',
  styleUrl: './vista-solicitud.css',
})
export class VistaSolicitud implements OnInit {

  oferta: any = null;
  cargando = true;
  error: string | null = null;

  // Estado de postulación (solo aplica si el usuario es alumno)
  esCandidato = false;
  practicaNum: number | null = null;
  yaPostulo = false;
  postulando = false;
  mensajePostulacion: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private ofertasService: OfertasService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'No se especificó una oferta.';
      this.cargando = false;
      return;
    }
    this.cargarOferta(+id);
  }

  volver(): void {
    window.history.back();
  }
  
  private cargarOferta(id: number): void {
    this.ofertasService.listarPostulaciones(id).subscribe({
      next: (oferta) => {
        this.oferta = oferta;
        this.cargando = false;

        // Si ya postuló antes a esta oferta, lo marcamos (viene incluido en postulaciones)
        const alumnoId = this.auth.getUsuario()?.alumno_id;
        if (alumnoId && oferta.postulaciones?.some((p: any) => p.alumno_id === alumnoId)) {
          this.yaPostulo = true;
        }

        if (this.auth.esAlumno()) {
          this.verificarCandidato();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar la información de la oferta.';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  private verificarCandidato(): void {
    const alumnoId = this.auth.getUsuario()?.alumno_id;
    if (!alumnoId) return;

    this.ofertasService.verificarCandidato(alumnoId).subscribe({
        next: (res) => {
          this.esCandidato = res.es_candidato;
          this.practicaNum = res.practica_num;
          this.cdr.detectChanges();
        },
        error: () => {
          // Si falla la verificación, dejamos el botón oculto por seguridad
          this.esCandidato = false;
          this.cdr.detectChanges();
        },
      });
  }

  postular(): void {
    const alumnoId = this.auth.getUsuario()?.alumno_id;
    if (!alumnoId || !this.practicaNum || !this.oferta) return;

    this.postulando = true;
    this.mensajePostulacion = null;

    this.ofertasService.postular(this.oferta.id, alumnoId, this.practicaNum).subscribe({
      next: () => {
        this.postulando = false;
        this.yaPostulo = true;
        this.mensajePostulacion = 'Postulación enviada correctamente.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.postulando = false;
        this.mensajePostulacion = err.error?.message ?? 'No se pudo enviar la postulación.';
        this.cdr.detectChanges();
      },
    });
  }

  get puedeVerBotonPostular(): boolean {
    return this.auth.esAlumno() && this.esCandidato && !this.yaPostulo;
  }
}
