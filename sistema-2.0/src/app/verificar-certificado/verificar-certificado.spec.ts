import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificarCertificado } from './verificar-certificado';

describe('VerificarCertificado', () => {
  let component: VerificarCertificado;
  let fixture: ComponentFixture<VerificarCertificado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarCertificado],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificarCertificado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
