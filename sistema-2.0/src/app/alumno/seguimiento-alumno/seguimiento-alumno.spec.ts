import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeguimientoAlumno } from './seguimiento-alumno';

describe('SeguimientoAlumno', () => {
  let component: SeguimientoAlumno;
  let fixture: ComponentFixture<SeguimientoAlumno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguimientoAlumno],
    }).compileComponents();

    fixture = TestBed.createComponent(SeguimientoAlumno);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
