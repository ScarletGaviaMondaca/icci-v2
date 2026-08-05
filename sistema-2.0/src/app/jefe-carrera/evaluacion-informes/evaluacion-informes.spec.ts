import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluacionInformes } from './evaluacion-informes';

describe('EvaluacionInformes', () => {
  let component: EvaluacionInformes;
  let fixture: ComponentFixture<EvaluacionInformes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluacionInformes],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluacionInformes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
