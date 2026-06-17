import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
 

@Component({
  selector: 'app-datos-acreditacion',
  imports: [CommonModule],
  templateUrl: './datos-acreditacion.html',
  styleUrl: './datos-acreditacion.css',
})
export class DatosAcreditacion {
  
    hoy = new Date();
 
  constructor(private router: Router) {}
 
  irA(ruta: string, ancla?: string): void {
    this.router.navigateByUrl(ruta).then(() => {
      if (ancla) {
        setTimeout(() => {
          const el = document.getElementById(ancla);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    });
  }

}
