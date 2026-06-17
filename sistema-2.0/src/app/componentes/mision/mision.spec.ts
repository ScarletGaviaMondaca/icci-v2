import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mision } from './mision';

describe('Mision', () => {
  let component: Mision;
  let fixture: ComponentFixture<Mision>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mision],
    }).compileComponents();

    fixture = TestBed.createComponent(Mision);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
