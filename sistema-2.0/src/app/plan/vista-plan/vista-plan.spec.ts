import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaPlan } from './vista-plan';

describe('VistaPlan', () => {
  let component: VistaPlan;
  let fixture: ComponentFixture<VistaPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VistaPlan],
    }).compileComponents();

    fixture = TestBed.createComponent(VistaPlan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
