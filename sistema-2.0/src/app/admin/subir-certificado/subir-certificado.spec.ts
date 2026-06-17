import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubirCertificado } from './subir-certificado';

describe('SubirCertificado', () => {
  let component: SubirCertificado;
  let fixture: ComponentFixture<SubirCertificado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubirCertificado],
    }).compileComponents();

    fixture = TestBed.createComponent(SubirCertificado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
