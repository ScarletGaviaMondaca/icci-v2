import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Seguimiento } from './seguimiento';

describe('Seguimiento', () => {
  let component: Seguimiento;
  let fixture: ComponentFixture<Seguimiento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Seguimiento],
    }).compileComponents();

    fixture = TestBed.createComponent(Seguimiento);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
