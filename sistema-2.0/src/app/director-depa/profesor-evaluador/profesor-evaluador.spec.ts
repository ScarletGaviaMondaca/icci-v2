import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfesorEvaluador } from './profesor-evaluador';

describe('ProfesorEvaluador', () => {
  let component: ProfesorEvaluador;
  let fixture: ComponentFixture<ProfesorEvaluador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfesorEvaluador],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfesorEvaluador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
