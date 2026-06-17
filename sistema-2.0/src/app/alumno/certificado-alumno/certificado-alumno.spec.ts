import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificadoAlumno } from './certificado-alumno';

describe('CertificadoAlumno', () => {
  let component: CertificadoAlumno;
  let fixture: ComponentFixture<CertificadoAlumno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificadoAlumno],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificadoAlumno);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
