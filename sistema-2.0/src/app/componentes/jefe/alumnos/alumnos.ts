import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-alumnos',
  imports: [ RouterModule],
  templateUrl: './alumnos.html',
  styleUrls: ['./alumnos.css'],
})
export class Alumnos implements OnInit {

  ngOnInit(): void {
  }

}
