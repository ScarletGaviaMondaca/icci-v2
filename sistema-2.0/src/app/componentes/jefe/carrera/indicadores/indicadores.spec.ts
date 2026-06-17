import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Indicadores } from './indicadores';

describe('Indicadores', () => {
  let component: Indicadores;
  let fixture: ComponentFixture<Indicadores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Indicadores],
    }).compileComponents();

    fixture = TestBed.createComponent(Indicadores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
