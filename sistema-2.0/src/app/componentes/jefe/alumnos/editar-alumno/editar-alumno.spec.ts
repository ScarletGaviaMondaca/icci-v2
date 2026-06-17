import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarAlumno } from './editar-alumno';

describe('EditarAlumno', () => {
  let component: EditarAlumno;
  let fixture: ComponentFixture<EditarAlumno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarAlumno],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarAlumno);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
