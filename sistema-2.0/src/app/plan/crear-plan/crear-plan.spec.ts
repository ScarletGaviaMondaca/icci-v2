import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearPlan } from './crear-plan';

describe('CrearPlan', () => {
  let component: CrearPlan;
  let fixture: ComponentFixture<CrearPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearPlan],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearPlan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
