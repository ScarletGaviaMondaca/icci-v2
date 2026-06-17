import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearAlumno } from './crear-alumno';

describe('CrearAlumno', () => {
  let component: CrearAlumno;
  let fixture: ComponentFixture<CrearAlumno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearAlumno],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearAlumno);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
