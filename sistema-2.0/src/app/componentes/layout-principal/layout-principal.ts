import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // Para que funcione el contenido central
import { Header } from '../header/header';
import { NotificacionesService } from '../../servicios/notificaciones.service';
import { AuthService } from '../../servicios/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-layout-principal',
  imports: [RouterOutlet, Header, CommonModule, FormsModule],
  templateUrl: './layout-principal.html',
  styleUrl: './layout-principal.css',
})
export class LayoutPrincipal implements OnInit {

  mostrarModalNotif = false;
  notificacionesPendientes: any[] = [];

  constructor(
    public notifSvc: NotificacionesService,
    public auth: AuthService,
    public cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.auth.esSecretaria()) {
      this.notifSvc.noLeidas().subscribe({
        next: (res) => {
          if (res.total > 0) {
            this.notifSvc.listar().subscribe({
              next: (data) => {
                this.notificacionesPendientes = data.filter(n => n.leida == 0);
                this.mostrarModalNotif = true;
                this.cdr.detectChanges();

              }
            });
          }
        }
      });
    }
  }
  marcarTodasYCerrar() {
  this.notifSvc.marcarTodasLeidas().subscribe();
  this.mostrarModalNotif = false;
}
}
