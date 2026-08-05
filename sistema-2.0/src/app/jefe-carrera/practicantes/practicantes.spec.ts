import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Practicantes } from './practicantes';

describe('Practicantes', () => {
  let component: Practicantes;
  let fixture: ComponentFixture<Practicantes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Practicantes],
    }).compileComponents();

    fixture = TestBed.createComponent(Practicantes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
