import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluacionSolicitud } from './evaluacion-solicitud';

describe('EvaluacionSolicitud', () => {
  let component: EvaluacionSolicitud;
  let fixture: ComponentFixture<EvaluacionSolicitud>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluacionSolicitud],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluacionSolicitud);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
