import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-portafolio',
  imports: [RouterModule],
  templateUrl: './portafolio.html',
  styleUrls: ['./portafolio.css'],
})
export class Portafolio {
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}


}
