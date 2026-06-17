import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlumnosAprobados } from './alumnos-aprobados';

describe('AlumnosAprobados', () => {
  let component: AlumnosAprobados;
  let fixture: ComponentFixture<AlumnosAprobados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlumnosAprobados],
    }).compileComponents();

    fixture = TestBed.createComponent(AlumnosAprobados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
