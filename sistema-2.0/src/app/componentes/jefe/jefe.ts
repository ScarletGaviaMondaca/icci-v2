import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-jefe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './jefe.html',
  styleUrls: ['./jefe.css'],
})
export class Jefe {

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

}