import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExalumnosPerfil } from './exalumnos-perfil';

describe('ExalumnosPerfil', () => {
  let component: ExalumnosPerfil;
  let fixture: ComponentFixture<ExalumnosPerfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExalumnosPerfil],
    }).compileComponents();

    fixture = TestBed.createComponent(ExalumnosPerfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
