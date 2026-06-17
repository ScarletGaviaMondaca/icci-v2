import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Exalumno, ExalumnosService } from '../servicios/exalumnos.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exalumnos',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './exalumnos.html',
  styleUrl: './exalumnos.css',
})

export class Exalumnos {

}
