import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluacionInforme } from './evaluacion-informe';

describe('EvaluacionInforme', () => {
  let component: EvaluacionInforme;
  let fixture: ComponentFixture<EvaluacionInforme>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluacionInforme],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluacionInforme);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
