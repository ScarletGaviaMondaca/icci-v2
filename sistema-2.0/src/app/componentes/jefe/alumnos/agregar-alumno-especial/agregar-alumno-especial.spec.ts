import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarAlumnoEspecial } from './agregar-alumno-especial';

describe('AgregarAlumnoEspecial', () => {
  let component: AgregarAlumnoEspecial;
  let fixture: ComponentFixture<AgregarAlumnoEspecial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarAlumnoEspecial],
    }).compileComponents();

    fixture = TestBed.createComponent(AgregarAlumnoEspecial);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
