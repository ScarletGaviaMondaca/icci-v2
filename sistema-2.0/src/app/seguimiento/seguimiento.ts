import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-seguimiento',
  imports: [RouterOutlet, CommonModule,RouterLink],
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.css',
})
export class Seguimiento {

}
