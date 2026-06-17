import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reglamentos } from './reglamentos';

describe('Reglamentos', () => {
  let component: Reglamentos;
  let fixture: ComponentFixture<Reglamentos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reglamentos],
    }).compileComponents();

    fixture = TestBed.createComponent(Reglamentos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
