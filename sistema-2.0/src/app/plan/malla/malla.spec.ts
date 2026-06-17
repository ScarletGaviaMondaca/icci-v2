import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Malla } from './malla';

describe('Malla', () => {
  let component: Malla;
  let fixture: ComponentFixture<Malla>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Malla],
    }).compileComponents();

    fixture = TestBed.createComponent(Malla);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
