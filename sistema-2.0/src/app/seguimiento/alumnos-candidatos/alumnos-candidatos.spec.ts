import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlumnosCandidatos } from './alumnos-candidatos';

describe('AlumnosCandidatos', () => {
  let component: AlumnosCandidatos;
  let fixture: ComponentFixture<AlumnosCandidatos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlumnosCandidatos],
    }).compileComponents();

    fixture = TestBed.createComponent(AlumnosCandidatos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
