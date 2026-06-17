import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeguimientoPractica } from './seguimiento-practica';

describe('SeguimientoPractica', () => {
  let component: SeguimientoPractica;
  let fixture: ComponentFixture<SeguimientoPractica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguimientoPractica],
    }).compileComponents();

    fixture = TestBed.createComponent(SeguimientoPractica);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
